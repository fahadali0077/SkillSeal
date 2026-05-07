import { Schema, model, Document, Types } from 'mongoose';

export interface IConnectionDocument extends Document {
  requesterId: Types.ObjectId;
  recipientId: Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  note: string;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectionSchema = new Schema<IConnectionDocument>(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'withdrawn'],
      default: 'pending',
    },
    note: { type: String, trim: true, maxlength: 300, default: '' },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────

// Unique compound – one connection record per pair (ordered requester → recipient)
ConnectionSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });
ConnectionSchema.index({ status: 1 });

export const Connection = model<IConnectionDocument>('Connection', ConnectionSchema);
