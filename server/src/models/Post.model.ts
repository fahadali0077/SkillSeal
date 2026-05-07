import { Schema, model, Document, Types } from 'mongoose';

export interface ILike {
  userId: Types.ObjectId;
  reaction: 'like' | 'celebrate' | 'support' | 'love' | 'insightful' | 'funny';
}

export interface ILinkPreview {
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
}

export interface IPollOption {
  text: string;
  votes: Types.ObjectId[];
}

export interface IPostDocument extends Document {
  authorId: Types.ObjectId;
  type: 'text' | 'image' | 'link' | 'article' | 'poll' | 'verification_announcement';
  content: string;
  imageUrls: string[];
  linkUrl: string;
  linkPreview: ILinkPreview;
  pollOptions: IPollOption[];
  pollDuration: number;
  tags: string[];
  likes: ILike[];
  comments: Types.ObjectId[];
  reposts: Types.ObjectId[];
  isVerificationAnnouncement: boolean;
  verificationId: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LikeSchema = new Schema<ILike>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reaction: {
      type: String,
      enum: ['like', 'celebrate', 'support', 'love', 'insightful', 'funny'],
      default: 'like',
    },
  },
  { _id: false }
);

const LinkPreviewSchema = new Schema<ILinkPreview>(
  {
    title: String,
    description: String,
    imageUrl: String,
    siteName: String,
  },
  { _id: false }
);

const PollOptionSchema = new Schema<IPollOption>(
  {
    text: { type: String, required: true, trim: true },
    votes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: true }
);

const PostSchema = new Schema<IPostDocument>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['text', 'image', 'link', 'article', 'poll', 'verification_announcement'],
      default: 'text',
    },
    content: { type: String, trim: true, maxlength: 5000, default: '' },
    imageUrls: [{ type: String }],
    linkUrl: { type: String, trim: true, default: '' },
    linkPreview: { type: LinkPreviewSchema, default: {} },
    pollOptions: [PollOptionSchema],
    pollDuration: { type: Number, default: 7 },  // days
    tags: [{ type: String, lowercase: true, trim: true }],
    likes: [LikeSchema],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    reposts: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isVerificationAnnouncement: { type: Boolean, default: false },
    verificationId: { type: Schema.Types.ObjectId, ref: 'Verification', default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────

PostSchema.index({ authorId: 1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ isDeleted: 1 });

export const Post = model<IPostDocument>('Post', PostSchema);
