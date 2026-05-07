// ─────────────────────────────────────────────────────────────────────────────
// Thread.model.ts  –  conversation thread metadata
// ─────────────────────────────────────────────────────────────────────────────
import { Schema, model, Document, Types } from 'mongoose';

export interface IThreadDocument extends Document {
  participantA:  Types.ObjectId;   // always the smaller ObjectId string
  participantB:  Types.ObjectId;   // always the larger ObjectId string
  lastMessageAt: Date;
  lastMessagePreview: string;
  unreadCountA:  number;
  unreadCountB:  number;
  isRequest:     boolean;          // true = not yet accepted into main inbox
  isArchivedA:   boolean;
  isArchivedB:   boolean;
  isDeletedA:    boolean;
  isDeletedB:    boolean;
  createdAt:     Date;
  updatedAt:     Date;
}

const ThreadSchema = new Schema<IThreadDocument>(
  {
    participantA:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participantB:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessageAt:       { type: Date, default: Date.now },
    lastMessagePreview:  { type: String, default: '' },
    unreadCountA:        { type: Number, default: 0 },
    unreadCountB:        { type: Number, default: 0 },
    isRequest:           { type: Boolean, default: false },
    isArchivedA:         { type: Boolean, default: false },
    isArchivedB:         { type: Boolean, default: false },
    isDeletedA:          { type: Boolean, default: false },
    isDeletedB:          { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Unique conversation between two users (canonical order by string comparison)
ThreadSchema.index({ participantA: 1, participantB: 1 }, { unique: true });
ThreadSchema.index({ participantA: 1, lastMessageAt: -1 });
ThreadSchema.index({ participantB: 1, lastMessageAt: -1 });

export const Thread = model<IThreadDocument>('Thread', ThreadSchema);

/** Returns the canonical [smaller, larger] ObjectId pair for a thread */
export function canonicalPair(
  idA: string,
  idB: string,
): [Types.ObjectId, Types.ObjectId] {
  const [a, b] = idA < idB ? [idA, idB] : [idB, idA];
  return [new Types.ObjectId(a), new Types.ObjectId(b)];
}
