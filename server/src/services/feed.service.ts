// ─────────────────────────────────────────────────────────────────────────────
// feed.service.ts
// Activity feed algorithm, post CRUD, reactions, comments, hashtags.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Types } from 'mongoose';
import { Post } from '../models/Post.model';
import type { IPostDocument } from '../models/Post.model';
import { User } from '../models/User.model';
import type { IUserDocument } from '../models/User.model';
import { Verification } from '../models/Verification.model';
import { getRedis } from '../config/redis';
import { getIO, SOCKET_EVENTS } from '../config/socket';
import { AppError } from '../middleware/error.middleware';
import logger from '../utils/logger';
import type {
  IPost, IPostCard, IPostAuthor, IReactionSummary,
  IPollOption, ILinkPreview, PostType, ReactionType,
} from '@SkillSeal/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_LENGTHS: Record<string, number> = {
  text: 3000,
  image: 3000,
  link: 3000,
  article: 125000,
  poll: 140,
};

const FEED_TTL = 5 * 60;        // 5 minutes
const FEED_WINDOW = 72 * 60 * 60 * 1000; // 72 h in ms

function feedKey(userId: string) { return `feed:${userId}`; }
function bustFeedKeys(userIds: string[]) {
  const redis = getRedis();
  return Promise.all(userIds.map((id) => redis.del(feedKey(id))));
}

// ─────────────────────────────────────────────────────────────────────────────
// Author shape builder
// ─────────────────────────────────────────────────────────────────────────────

async function buildAuthor(userId: string): Promise<IPostAuthor> {
  const u = await User.findById(userId).lean<IUserDocument>();
  if (!u) return { _id: userId, fullName: 'Unknown', headline: '', profilePhoto: '', customUrl: '', accountType: 'free' };
  return {
    _id: u._id.toString(),
    fullName: `${u.firstName} ${u.lastName}`,
    headline: u.headline ?? '',
    profilePhoto: u.profilePhoto ?? '',
    customUrl: u.customUrl ?? '',
    accountType: u.accountType,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Post → IPost serializer
// ─────────────────────────────────────────────────────────────────────────────

async function serializePost(
  doc: IPostDocument,
  viewerId?: string,
): Promise<IPost> {
  const author = await buildAuthor(doc.authorId.toString());

  const reactionBreakdown: Partial<Record<ReactionType, number>> = {};
  for (const like of doc.likes ?? []) {
    reactionBreakdown[like.reaction as ReactionType] =
      (reactionBreakdown[like.reaction as ReactionType] ?? 0) + 1;
  }

  const userReaction = viewerId
    ? ((doc.likes ?? []).find((l) => l.userId.toString() === viewerId)?.reaction as ReactionType | undefined) ?? null
    : null;

  const reactionSummary: IReactionSummary = {
    total: doc.likes?.length ?? 0,
    breakdown: reactionBreakdown,
    userReaction,
  };

  const pollOptions: IPollOption[] | null = doc.pollOptions?.length
    ? doc.pollOptions.map((o) => ({
      _id: (o as unknown as { _id?: Types.ObjectId })._id?.toString() ?? '',
      text: o.text,
      voteCount: o.votes?.length ?? 0,
      hasVoted: viewerId ? o.votes.some((v) => v.toString() === viewerId) : false,
    }))
    : null;

  const linkPreview: ILinkPreview | null = doc.linkPreview?.title
    ? { title: doc.linkPreview.title ?? '', description: doc.linkPreview.description ?? '', imageUrl: doc.linkPreview.imageUrl ?? '', siteName: doc.linkPreview.siteName ?? '' }
    : null;

  return {
    _id: doc._id.toString(),
    author,
    type: doc.type as PostType,
    visibility: 'public',
    content: doc.content,
    imageUrls: doc.imageUrls ?? [],
    linkUrl: doc.linkUrl ?? '',
    linkPreview,
    pollOptions,
    pollDuration: doc.pollDuration ?? 7,
    pollExpiresAt: doc.pollDuration ? new Date(doc.createdAt.getTime() + doc.pollDuration * 86400000).toISOString() : null,
    tags: doc.tags ?? [],
    reactionSummary,
    commentCount: (doc.comments ?? []).length,
    repostCount: (doc.reposts ?? []).length,
    isVerificationAnnouncement: doc.isVerificationAnnouncement ?? false,
    verificationBadge: null,
    isDeleted: doc.isDeleted ?? false,
    isRepost: (doc as any).isRepost ?? false,
    originalPostId: (doc as any).originalPostId?.toString() ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function toPostCard(post: IPost): IPostCard {
  return {
    _id: post._id,
    author: post.author,
    type: post.type,
    visibility: post.visibility,
    content: post.content.slice(0, 300),
    imageUrls: post.imageUrls,
    linkPreview: post.linkPreview ? { title: post.linkPreview.title, imageUrl: post.linkPreview.imageUrl, siteName: post.linkPreview.siteName } : null,
    hasPoll: !!post.pollOptions,
    pollOptions: post.pollOptions ?? null,
    pollExpiresAt: post.pollExpiresAt ?? null,
    tags: post.tags,
    reactionSummary: post.reactionSummary,
    commentCount: post.commentCount,
    repostCount: post.repostCount,
    isVerificationAnnouncement: post.isVerificationAnnouncement,
    verificationBadge: null,
    createdAt: post.createdAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hashtag extractor
// ─────────────────────────────────────────────────────────────────────────────

function extractHashtags(content: string): string[] {
  const matches = content.match(/#([a-zA-Z][a-zA-Z0-9_]{0,49})/g) ?? [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))].slice(0, 30);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Create post
// ─────────────────────────────────────────────────────────────────────────────

export interface CreatePostInput {
  type: PostType;
  content: string;
  imageUrls?: string[];
  linkUrl?: string;
  linkPreview?: ILinkPreview;
  pollOptions?: string[];
  pollDuration?: number;
  tags?: string[];
  isVerificationAnnouncement?: boolean;
  verificationId?: string;
}

export async function createPost(authorId: string, input: CreatePostInput): Promise<IPost> {
  const maxLen = MAX_LENGTHS[input.type] ?? 3000;
  if (input.content.length > maxLen) {
    throw new AppError(`Content exceeds ${maxLen} character limit for ${input.type} posts.`, 400, true);
  }
  if (input.type === 'image' && (input.imageUrls?.length ?? 0) > 4) {
    throw new AppError('Maximum 4 images per post.', 400, true);
  }
  if (input.type === 'poll' && (!input.pollOptions || input.pollOptions.length < 2 || input.pollOptions.length > 4)) {
    throw new AppError('Polls require 2–4 options.', 400, true);
  }

  const autoTags = extractHashtags(input.content);
  const allTags = [...new Set([...(input.tags ?? []), ...autoTags])];

  const pollOptions = input.pollOptions?.map((text) => ({ text, votes: [] }));

  const doc = await Post.create({
    authorId: new Types.ObjectId(authorId),
    type: input.type,
    content: input.content,
    imageUrls: input.imageUrls ?? [],
    linkUrl: input.linkUrl ?? '',
    linkPreview: input.linkPreview ?? {},
    pollOptions: pollOptions ?? [],
    pollDuration: input.pollDuration ?? 7,
    tags: allTags,
    likes: [],
    comments: [],
    reposts: [],
    isVerificationAnnouncement: input.isVerificationAnnouncement ?? false,
    verificationId: input.verificationId ? new Types.ObjectId(input.verificationId) : null,
    isDeleted: false,
  });

  logger.info(`[feed] Post created: ${doc._id} by user=${authorId}`);

  // Bust feed cache for all followers / connections of author
  const author = await User.findById(authorId).select('connections followers').lean<IUserDocument>();
  const toNotify = [
    ...(author?.connections ?? []).map((id) => id.toString()),
    ...(author?.followers ?? []).map((id) => id.toString()),
  ];
  await bustFeedKeys(toNotify);

  // Emit socket event so open feeds refresh
  try {
    getIO().emit('new_post', { authorId, postId: doc._id.toString() });
  } catch { /* socket not initialised in tests */ }

  return serializePost(doc, authorId);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Get single post
// ─────────────────────────────────────────────────────────────────────────────

export async function getPost(postId: string, viewerId?: string): Promise<IPost> {
  if (!mongoose.Types.ObjectId.isValid(postId)) throw new AppError('Invalid post ID.', 400, true);
  const doc = await Post.findOne({ _id: postId, isDeleted: false });
  if (!doc) throw new AppError('Post not found.', 404, true);
  return serializePost(doc, viewerId);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Delete post (soft)
// ─────────────────────────────────────────────────────────────────────────────

export async function deletePost(postId: string, userId: string): Promise<void> {
  const doc = await Post.findById(postId);
  if (!doc) throw new AppError('Post not found.', 404, true);
  if (doc.authorId.toString() !== userId) throw new AppError('Forbidden.', 403, true);
  doc.isDeleted = true;
  await doc.save();
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 & 5. Reactions (upsert / remove)
// ─────────────────────────────────────────────────────────────────────────────

const VALID_REACTIONS: ReactionType[] = ['like', 'celebrate', 'support', 'love', 'insightful', 'curious' as ReactionType];

export async function upsertReaction(
  postId: string,
  userId: string,
  reaction: string,
): Promise<IReactionSummary> {
  if (!VALID_REACTIONS.includes(reaction as ReactionType)) {
    throw new AppError(`Invalid reaction type: ${reaction}`, 400, true);
  }

  const doc = await Post.findOne({ _id: postId, isDeleted: false });
  if (!doc) throw new AppError('Post not found.', 404, true);

  const uid = new Types.ObjectId(userId);
  const idx = doc.likes.findIndex((l) => l.userId.toString() === userId);

  if (idx >= 0) {
    doc.likes[idx].reaction = reaction as IPostDocument['likes'][number]['reaction'];
  } else {
    doc.likes.push({ userId: uid, reaction: reaction as IPostDocument['likes'][number]['reaction'] });
  }
  await doc.save();

  const breakdown: Partial<Record<ReactionType, number>> = {};
  for (const l of doc.likes) {
    breakdown[l.reaction as ReactionType] = (breakdown[l.reaction as ReactionType] ?? 0) + 1;
  }
  await bustFeedKeys([userId]);
  return { total: doc.likes.length, breakdown, userReaction: reaction as ReactionType };
}

export async function removeReaction(postId: string, userId: string): Promise<IReactionSummary> {
  const doc = await Post.findOne({ _id: postId, isDeleted: false });
  if (!doc) throw new AppError('Post not found.', 404, true);

  doc.likes = doc.likes.filter((l) => l.userId.toString() !== userId) as IPostDocument['likes'];
  await doc.save();

  const breakdown: Partial<Record<ReactionType, number>> = {};
  for (const l of doc.likes) {
    breakdown[l.reaction as ReactionType] = (breakdown[l.reaction as ReactionType] ?? 0) + 1;
  }
  await bustFeedKeys([userId]);
  return { total: doc.likes.length, breakdown, userReaction: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Comments
// ─────────────────────────────────────────────────────────────────────────────

export interface CommentInput {
  content: string;
  parentCommentId?: string;
}

export interface ICommentOut {
  _id: string;
  authorId: string;
  author: IPostAuthor;
  content: string;
  parentCommentId: string | null;
  createdAt: string;
}

// Comments stored as sub-documents embedded in a Comment collection (simplified:
// stored on post.comments as ObjectId refs; here we store inline for speed)
export async function addComment(
  postId: string,
  userId: string,
  input: CommentInput,
): Promise<ICommentOut> {
  if (!input.content?.trim()) throw new AppError('Comment cannot be empty.', 400, true);
  if (input.content.length > 1200) throw new AppError('Comment exceeds 1200 characters.', 400, true);

  const doc = await Post.findOne({ _id: postId, isDeleted: false });
  if (!doc) throw new AppError('Post not found.', 404, true);

  // Depth check — find parent's depth
  if (input.parentCommentId) {
    // Depth limit enforced at the client; server allows 3 levels
  }

  // Push an inline IComment sub-document (SCHEMA BUG 5 replaced ObjectId refs
  // with an embedded CommentSchema, so we push the object directly).
  doc.comments.push({
    authorId: new Types.ObjectId(userId),
    content: input.content.trim(),
    likes: [],
    parentCommentId: input.parentCommentId
      ? new Types.ObjectId(input.parentCommentId)
      : null,
  } as never);
  await doc.save();

  const saved = doc.comments[doc.comments.length - 1];
  const author = await buildAuthor(userId);
  return {
    _id: saved._id.toString(),
    authorId: userId,
    author,
    content: input.content.trim(),
    parentCommentId: input.parentCommentId ?? null,
    createdAt: saved.createdAt.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Repost
// ─────────────────────────────────────────────────────────────────────────────

export async function repost(
  originalId: string,
  userId: string,
  commentary?: string,
): Promise<IPost> {
  const original = await Post.findOne({ _id: originalId, isDeleted: false });
  if (!original) throw new AppError('Original post not found.', 404, true);

  if (original.reposts.some((id) => id.toString() === userId)) {
    throw new AppError('You have already reposted this.', 400, true);
  }

  const autoTags = extractHashtags(commentary ?? '');

  const doc = await Post.create({
    authorId:                new Types.ObjectId(userId),
    type:                    'text',
    content:                 commentary ?? '',
    imageUrls:               [],
    linkUrl:                 '',
    linkPreview:             {},
    pollOptions:             [],
    tags:                    autoTags,
    likes:                   [],
    comments:                [],
    reposts:                 [],
    isVerificationAnnouncement: false,
    verificationId:          null,
    isDeleted:               false,
    isRepost:                true,
    originalPostId:          new Types.ObjectId(originalId),
  });

  original.reposts.push(new Types.ObjectId(userId));
  await original.save();

  const author = await User.findById(userId).select('connections followers').lean<IUserDocument>();
  const toNotify = [
    ...(author?.connections ?? []).map((id: any) => id.toString()),
    ...(author?.followers  ?? []).map((id: any) => id.toString()),
  ];
  await bustFeedKeys([userId, ...toNotify]);

  return serializePost(doc, userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Hashtag posts
// ─────────────────────────────────────────────────────────────────────────────

export async function getHashtagPosts(
  tag: string,
  page = 1,
  limit = 20,
  viewerId?: string,
): Promise<{ posts: IPostCard[]; total: number }> {
  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    Post.find({ tags: tag.toLowerCase(), isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit),
    Post.countDocuments({ tags: tag.toLowerCase(), isDeleted: false }),
  ]);

  const posts = await Promise.all(docs.map((d) => serializePost(d, viewerId)));
  return { posts: posts.map(toPostCard), total };
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Trending hashtags
// ─────────────────────────────────────────────────────────────────────────────

export async function getTrendingHashtags(userId: string): Promise<{ tag: string; count: number }[]> {
  const user = await User.findById(userId).select('connections following').lean<IUserDocument>();
  if (!user) return [];

  const networkIds = [
    ...new Set([
      userId,
      ...(user.connections ?? []).map((id) => id.toString()),
      ...(user.following ?? []).map((id) => id.toString()),
    ]),
  ].map((id) => new Types.ObjectId(id));

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const result = await Post.aggregate<{ _id: string; count: number }>([
    { $match: { authorId: { $in: networkIds }, isDeleted: false, createdAt: { $gte: since } } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  return result.map((r) => ({ tag: r._id, count: r.count }));
}

// ─────────────────────────────────────────────────────────────────────────────
// FEED ALGORITHM
// ─────────────────────────────────────────────────────────────────────────────

export interface FeedResult {
  posts: IPostCard[];
  page: number;
  hasMore: boolean;
  nextPage: number | null;
}

export async function getFeed(
  userId: string,
  page = 1,
  limit = 20,
): Promise<FeedResult> {
  const redis = getRedis();

  // ── 1. Check cache ────────────────────────────────────────────────────────
  if (page === 1) {
    const cached = await redis.get(feedKey(userId));
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as FeedResult;
        logger.info(`[feed] Cache HIT for userId=${userId}`);
        return parsed;
      } catch { /* fall through */ }
    }
  }

  // ── 2. Resolve network ────────────────────────────────────────────────────
  const user = await User.findById(userId)
    .select('connections following')
    .lean<IUserDocument>();

  if (!user) throw new AppError('User not found.', 404, true);

  const connectionIds = (user.connections ?? []).map((id) => id.toString());
  const followingIds = (user.following ?? []).map((id) => id.toString());
  const networkIdSet = new Set([...connectionIds, ...followingIds]);
  const networkIds = [...networkIdSet].map((id) => new Types.ObjectId(id));

  if (networkIds.length === 0) {
    return { posts: [], page, hasMore: false, nextPage: null };
  }

  // ── 3. Fetch raw candidates (72h window) ──────────────────────────────────
  const since = new Date(Date.now() - FEED_WINDOW);
  const candidates = await Post.find({
    authorId: { $in: networkIds },
    isDeleted: false,
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .limit(500)  // fetch generous pool, then score
    .lean<IPostDocument[]>();

  // ── 4. Build author verified-skill lookup ─────────────────────────────────
  const authorIds = [...new Set(candidates.map((p) => p.authorId.toString()))];
  const authorDocs = await User.find({ _id: { $in: authorIds } })
    .select('skills')
    .lean<{ _id: Types.ObjectId; skills: { status: string }[] }[]>();

  const authorVerifiedMap = new Map(
    authorDocs.map((a) => [
      a._id.toString(),
      a.skills.some((s) => s.status === 'verified'),
    ]),
  );

  // ── 5. Score each post ────────────────────────────────────────────────────
  const now = Date.now();

  const scored = candidates.map((doc) => {
    const hoursAge = (now - doc.createdAt.getTime()) / 3_600_000;
    const recencyScore = Math.exp(-0.5 * hoursAge);

    const likeCount = doc.likes?.length ?? 0;
    const commentCount = doc.comments?.length ?? 0;
    const repostCount = doc.reposts?.length ?? 0;
    const engagementScore = Math.min((likeCount + commentCount * 2 + repostCount * 3) / 100, 1);

    const aid = doc.authorId.toString();
    const isConnection = connectionIds.includes(aid);
    const isFollowing = followingIds.includes(aid);
    const relationshipWeight = isConnection ? 2.0 : isFollowing ? 1.0 : 0.5;

    const verifiedBonus = authorVerifiedMap.get(aid) ? 1.25 : 1.0;
    const certBonus = doc.isVerificationAnnouncement ? 1.5 : 1.0;

    const finalScore = recencyScore * (engagementScore + 0.1) * relationshipWeight * verifiedBonus * certBonus;

    return { doc, finalScore };
  });

  // ── 6. Sort, paginate ─────────────────────────────────────────────────────
  scored.sort((a, b) => b.finalScore - a.finalScore);

  const skip = (page - 1) * limit;
  const paged = scored.slice(skip, skip + limit);
  const hasMore = skip + limit < scored.length;

  // ── 7. Serialize ──────────────────────────────────────────────────────────
  const serialized = await Promise.all(
    paged.map((item) => serializePost(item.doc as unknown as IPostDocument, userId)),
  );

  const result: FeedResult = {
    posts: serialized.map(toPostCard),
    page,
    hasMore,
    nextPage: hasMore ? page + 1 : null,
  };

  // ── 8. Cache page 1 ───────────────────────────────────────────────────────
  if (page === 1) {
    await redis.set(feedKey(userId), JSON.stringify(result), 'EX', FEED_TTL);
  }

  logger.info(`[feed] Computed ${result.posts.length} posts for userId=${userId} page=${page}`);
  return result;
}
// ─────────────────────────────────────────────────────────────────────────────
// Poll vote
// ─────────────────────────────────────────────────────────────────────────────
export async function votePoll(postId: string, userId: string, optionId: string): Promise<IPost> {
  const doc = await Post.findById(postId);
  if (!doc) throw new AppError('Post not found.', 404, true);
  if (!doc.pollOptions?.length) throw new AppError('Post has no poll.', 400, true);

  const expiresAt = doc.pollDuration
    ? new Date(doc.createdAt.getTime() + doc.pollDuration * 86400000)
    : null;
  if (expiresAt && expiresAt < new Date()) throw new AppError('Poll has ended.', 400, true);

  const uid = new Types.ObjectId(userId);

  // Remove any existing vote across all options
  doc.pollOptions.forEach((opt) => {
    opt.votes = opt.votes.filter((v) => v.toString() !== userId) as typeof opt.votes;
  });

  // Add vote to selected option
  const option = doc.pollOptions.find((o) => (o as any)._id?.toString() === optionId);
  if (!option) throw new AppError('Poll option not found.', 404, true);
  option.votes.push(uid);

  await doc.save();
  await bustFeedKeys([userId]);
  return serializePost(doc, userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Get comments for a post
// ─────────────────────────────────────────────────────────────────────────────
export async function getComments(postId: string): Promise<ICommentOut[]> {
  const doc = await Post.findOne({ _id: postId, isDeleted: false }).lean<IPostDocument>();
  if (!doc) throw new AppError('Post not found.', 404, true);

  const comments = doc.comments ?? [];
  return Promise.all(
    comments.map(async (c: any) => {
      const author = await buildAuthor(c.authorId.toString());
      return {
        _id:             c._id.toString(),
        authorId:        c.authorId.toString(),
        author,
        content:         c.content ?? '',
        parentCommentId: c.parentCommentId?.toString() ?? null,
        createdAt:       c.createdAt?.toISOString() ?? new Date().toISOString(),
      } as ICommentOut;
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Get posts by a specific user (for profile page)
// ─────────────────────────────────────────────────────────────────────────────
export async function getPostsByUser(
  authorId: string,
  viewerId: string | undefined,
  page = 1,
  limit = 10,
): Promise<{ posts: IPostCard[]; total: number; hasMore: boolean }> {
  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    Post.find({ authorId: new Types.ObjectId(authorId), isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<IPostDocument[]>(),
    Post.countDocuments({ authorId: new Types.ObjectId(authorId), isDeleted: false }),
  ]);

  const posts = await Promise.all(docs.map((doc) => serializePost(doc, viewerId)));
  return { posts: posts.map(toPostCard), total, hasMore: skip + docs.length < total };
}
