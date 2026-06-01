import { API_ORIGIN, apiFetch } from '../../lib/apiBase';
// ─────────────────────────────────────────────────────────────────────────────
// feedApi.ts  –  typed API calls for feed, posts, reactions, hashtags
// All URLs must be absolute (prefixed with API_ORIGIN) so requests go to the
// Render backend in production, not to the Vercel frontend host.
// ─────────────────────────────────────────────────────────────────────────────
import type { IPost, IPostCard, IReactionSummary, PostType, ReactionType } from '@SkillSeal/shared';

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
    apiFetch<FeedPage>(`${API_ORIGIN}/api/v1/feed?page=${page}&limit=20`),

  // Posts
  createPost: (data: CreatePostInput) =>
    apiFetch<IPost>(`${API_ORIGIN}/api/v1/posts`, { method: 'POST', body: JSON.stringify(data) }),

  getPost: (id: string) =>
    apiFetch<IPost>(`${API_ORIGIN}/api/v1/posts/${id}`),

  deletePost: (id: string) =>
    apiFetch<null>(`${API_ORIGIN}/api/v1/posts/${id}`, { method: 'DELETE' }),

  // Reactions
  react: (postId: string, reaction: ReactionType) =>
    apiFetch<IReactionSummary>(`${API_ORIGIN}/api/v1/posts/${postId}/like`, {
      method: 'POST', body: JSON.stringify({ reaction }),
    }),

  unreact: (postId: string) =>
    apiFetch<IReactionSummary>(`${API_ORIGIN}/api/v1/posts/${postId}/like`, { method: 'DELETE' }),

  // Comments
  addComment: (postId: string, content: string, parentCommentId?: string) =>
    apiFetch<CommentOut>(`${API_ORIGIN}/api/v1/posts/${postId}/comments`, {
      method: 'POST', body: JSON.stringify({ content, parentCommentId }),
    }),

  // Repost
  repost: (postId: string, commentary?: string) =>
    apiFetch<IPost>(`${API_ORIGIN}/api/v1/posts/${postId}/repost`, {
      method: 'POST', body: JSON.stringify({ commentary }),
    }),

  // Get posts by a specific user (for profile page)
  getUserPosts: (userId: string, page = 1) =>
    apiFetch<{ posts: IPostCard[]; total: number; hasMore: boolean }>(
      `${API_ORIGIN}/api/v1/users/${userId}/posts?page=${page}&limit=10`,
    ),

  // Vote on poll
  vote: (postId: string, optionId: string) =>
    apiFetch<IPost>(`${API_ORIGIN}/api/v1/posts/${postId}/vote`, {
      method: 'POST', body: JSON.stringify({ optionId }),
    }),

  // Get comments for a post
  getComments: (postId: string) =>
    apiFetch<CommentOut[]>(`${API_ORIGIN}/api/v1/posts/${postId}/comments`),

  // HIGH-04: scrape Open Graph tags for a URL
  scrapeLink: (url: string) =>
    apiFetch<{ title: string; description: string; imageUrl: string; siteName: string }>(
      `${API_ORIGIN}/api/v1/posts/scrape-link`,
      { method: 'POST', body: JSON.stringify({ url }) },
    ),

  // HIGH-07: delete a comment
  deleteComment: (postId: string, commentId: string) =>
    apiFetch<null>(`${API_ORIGIN}/api/v1/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
    }),

  // HIGH-08: toggle like on a comment
  likeComment: (postId: string, commentId: string) =>
    apiFetch<{ likeCount: number; hasLiked: boolean }>(
      `${API_ORIGIN}/api/v1/posts/${postId}/comments/${commentId}/like`,
      { method: 'POST' },
    ),

  // BROKEN-03: upload image file (used by CreatePostModal image tab).
  uploadImage: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    // apiFetch sets JSON Content-Type by default; FormData uploads need the
    // browser to pick a multipart boundary, so use a bare fetch here.
    const token = localStorage.getItem('accessToken') ?? '';
    const res = await fetch(`${API_ORIGIN}/api/v1/users/me/upload-photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    const json = await res.json();
    return { url: json?.data?.photoUrl ?? '' };
  },

  // Hashtags
  getHashtagPosts: (tag: string, page: number) =>
    apiFetch<{ posts: IPostCard[]; total: number }>(
      `${API_ORIGIN}/api/v1/hashtags/${encodeURIComponent(tag)}/posts?page=${page}&limit=20`,
    ),

  getTrending: () =>
    apiFetch<{ tag: string; count: number }[]>(`${API_ORIGIN}/api/v1/hashtags/trending`),
};
