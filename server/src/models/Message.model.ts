import { Schema, model, Document, Types } from 'mongoose';

export interface IAttachment {
  url: string;
  type: 'image' | 'document' | 'video' | 'audio' | 'other';
  name: string;
  sizeBytes: number;
}

export interface IReaction {
  userId: Types.ObjectId;
  emoji: string;
}

export interface IMessageDocument extends Document {
  threadId: Types.ObjectId;
  senderId: Types.ObjectId;
  // recipientId removed — SCHEMA BUG 6: it was redundant with Thread.participantA/B
  // and could drift. Queries that need the recipient derive it from the Thread.
  content: string;
  attachments: IAttachment[];
  readAt: Date | null;
  isDeleted: boolean;
  isInMailMessage: boolean;
  reactions: IReaction[];
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    url: { type: String, required: true },
    type: {
      type: String,
      enum: ['image', 'document', 'video', 'audio', 'other'],
      default: 'other',
    },
    name: { type: String, default: '' },
    sizeBytes: { type: Number, default: 0 },
  },
  { _id: false }
);

const ReactionSchema = new Schema<IReaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessageDocument>(
  {
    threadId: { type: Schema.Types.ObjectId, ref: 'Thread', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // recipientId removed — see IMessageDocument comment above.
    content: { type: String, trim: true, maxlength: 10000, default: '' },
    attachments: [AttachmentSchema],
    readAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    isInMailMessage: { type: Boolean, default: false }, // LinkedIn InMail equivalent
    reactions: [ReactionSchema],
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────

MessageSchema.index({ threadId: 1, createdAt: 1 });
// SCHEMA BUG 6: replaced { senderId, recipientId } with { senderId, createdAt }
// since recipientId is no longer stored on Message documents.
MessageSchema.index({ senderId: 1, createdAt: -1 });

export const Message = model<IMessageDocument>('Message', MessageSchema);
