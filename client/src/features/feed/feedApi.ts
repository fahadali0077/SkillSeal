import { API_ORIGIN } from '../../lib/apiBase';
// ─────────────────────────────────────────────────────────────────────────────
// feedApi.ts  –  typed API calls for feed, posts, reactions, hashtags
// ─────────────────────────────────────────────────────────────────────────────
import type { IPost, IPostCard, IReactionSummary, PostType, ReactionType } from '@SkillSeal/shared';

async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init,
  });
  const json = await res.json() as { success: boolean; data: T; message: string };
  if (!json.success) throw new Error((json as unknown as { message: string }).message);
  return json.data;
}

export interface FeedPage {
  posts: IPostCard[];
  page: number;
  hasMore: boolean;
  nextPage: number | null;
}

export interface CreatePostInput {
  type: PostType;
  content: string;
  imageUrls?: string[];
  linkUrl?: string;
  linkPreview?: { title?: string; description?: string; imageUrl?: string; siteName?: string };
  pollOptions?: string[];
  pollDuration?: number;
  tags?: string[];
}

export interface CommentOut {
  _id: string;
  authorId: string;
  author: { _id: string; fullName: string; profilePhoto: string; customUrl: string };
  content: string;
  parentCommentId: string | null;
  createdAt: string;
}

export const feedApi = {
  // Feed
  getFeed: (page: number) =>
    apiFetch<FeedPage>(`/api/v1/feed?page=${page}&limit=20`),

  // Posts
  createPost: (data: CreatePostInput) =>
    apiFetch<IPost>(`${API_ORIGIN}/api/v1/posts`, { method: 'POST', body: JSON.stringify(data) }),

  getPost: (id: string) =>
    apiFetch<IPost>(`/api/v1/posts/${id}`),

  deletePost: (id: string) =>
    apiFetch<null>(`/api/v1/posts/${id}`, { method: 'DELETE' }),

  // Reactions
  react: (postId: string, reaction: ReactionType) =>
    apiFetch<IReactionSummary>(`/api/v1/posts/${postId}/like`, {
      method: 'POST', body: JSON.stringify({ reaction }),
    }),

  unreact: (postId: string) =>
    apiFetch<IReactionSummary>(`/api/v1/posts/${postId}/like`, { method: 'DELETE' }),

  // Comments
  addComment: (postId: string, content: string, parentCommentId?: string) =>
    apiFetch<CommentOut>(`/api/v1/posts/${postId}/comments`, {
      method: 'POST', body: JSON.stringify({ content, parentCommentId }),
    }),

  // Repost
  repost: (postId: string, commentary?: string) =>
    apiFetch<IPost>(`/api/v1/posts/${postId}/repost`, {
      method: 'POST', body: JSON.stringify({ commentary }),
    }),

  // Hashtags
  getHashtagPosts: (tag: string, page: number) =>
    apiFetch<{ posts: IPostCard[]; total: number }>(`/api/v1/hashtags/${encodeURIComponent(tag)}/posts?page=${page}&limit=20`),

  getTrending: () =>
    apiFetch<{ tag: string; count: number }[]>(`${API_ORIGIN}/api/v1/hashtags/trending`),
};
