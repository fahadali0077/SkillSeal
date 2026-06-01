export type PostType = 'text' | 'article' | 'image' | 'video' | 'document';

export type PostVisibility = 'public' | 'connections' | 'private';

export interface IPost {
  _id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  authorHeadline?: string;
  type: PostType;
  content: string;
  mediaUrls?: string[];
  tags?: string[];
  visibility: PostVisibility;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  hasLiked?: boolean;
  comments?: IComment[];
  createdAt: string;
  updatedAt: string;
}

export interface IComment {
  _id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  content: string;
  likeCount: number;
  hasLiked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IPostCreatePayload {
  type: PostType;
  content: string;
  mediaUrls?: string[];
  tags?: string[];
  visibility: PostVisibility;
}
