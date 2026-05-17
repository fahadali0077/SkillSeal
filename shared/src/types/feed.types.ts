// ─────────────────────────────────────────────────────────────────────────────
// feed.types.ts
// Shared feed / social types for SkillSeal client & server
// ─────────────────────────────────────────────────────────────────────────────

import type { SkillTier, VerificationStatus } from './verification.types';

// ── Enumerations ──────────────────────────────────────────────────────────────

export type PostType =
  | 'text'
  | 'image'
  | 'link'
  | 'article'
  | 'poll'
  | 'verification_announcement';

export type ReactionType =
  | 'like'
  | 'celebrate'
  | 'support'
  | 'love'
  | 'insightful'
  | 'curious'
  | 'funny';

export type PostVisibility = 'public' | 'connections' | 'private';

// ── Author mini-profile (denormalised for feed performance) ───────────────────

export interface IPostAuthor {
  _id: string;
  fullName: string;
  headline: string;
  profilePhoto: string;
  customUrl: string;
  accountType: string;
}

// ── Poll ──────────────────────────────────────────────────────────────────────

export interface IPollOption {
  _id: string;
  text: string;
  voteCount: number;
  hasVoted: boolean;       // relative to the requesting user
}

// ── Link preview ──────────────────────────────────────────────────────────────

export interface ILinkPreview {
  title: string;
  description: string;
  imageUrl: string;
  siteName: string;
}

// ── Verification badge embedded in announcement posts ─────────────────────────

export interface IVerificationBadge {
  verificationId: string;
  skillName: string;
  skillSlug: string;
  tier: SkillTier;
  compositeScore: number;
  status: VerificationStatus;
  certificateUrl: string;
}

// ── Reaction summary ──────────────────────────────────────────────────────────

export interface IReactionSummary {
  total: number;
  breakdown: Partial<Record<ReactionType, number>>;
  userReaction: ReactionType | null;   // requesting user's current reaction
}

// ── Comment ───────────────────────────────────────────────────────────────────

export interface IComment {
  _id: string;
  postId: string;
  author: IPostAuthor;
  content: string;
  reactionSummary: IReactionSummary;
  replyCount: number;
  parentCommentId: string | null;      // null = top-level comment
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Full post (detailed view) ─────────────────────────────────────────────────

export interface IPost {
  _id: string;
  author: IPostAuthor;
  type: PostType;
  visibility: PostVisibility;
  content: string;
  imageUrls: string[];
  linkUrl: string;
  linkPreview: ILinkPreview | null;
  pollOptions: IPollOption[] | null;
  pollDuration: number;               // days
  pollExpiresAt: string | null;       // ISO date string
  tags: string[];
  reactionSummary: IReactionSummary;
  commentCount: number;
  repostCount: number;
  isVerificationAnnouncement: boolean;
  verificationBadge: IVerificationBadge | null;
  isDeleted: boolean;
  isRepost: boolean;
  originalPostId: string | null;
  // CRIT-10/HIGH-09: when isRepost is true, the fully serialized original post.
  // null when the original is missing/deleted or this is not a repost.
  originalPost: IPost | null;
  createdAt: string;
  updatedAt: string;
}

// ── Post card (feed-optimised summary) ───────────────────────────────────────
// A lightweight projection used when rendering the feed list.
// Comments are NOT included — loaded separately on demand.

export interface IPostCard {
  _id: string;
  author: IPostAuthor;
  type: PostType;
  visibility: PostVisibility;
  content: string;                    // truncated to 300 chars server-side
  // HIGH-22: true when the full post content exceeds 300 chars and the client
  // should show a "Read more →" link to the detail page.
  isTruncated: boolean;
  imageUrls: string[];
  linkPreview: Pick<ILinkPreview, 'title' | 'imageUrl' | 'siteName'> | null;
  hasPoll: boolean;
  pollOptions: IPollOption[] | null;
  pollExpiresAt: string | null;
  tags: string[];
  reactionSummary: IReactionSummary;
  commentCount: number;
  repostCount: number;
  isVerificationAnnouncement: boolean;
  verificationBadge: IVerificationBadge | null;
  // CRIT-10/HIGH-09: repost metadata on the card so feed items can render the
  // nested original post inline. originalPost is the same lightweight card.
  isRepost: boolean;
  originalPost: IPostCard | null;
  createdAt: string;
}
