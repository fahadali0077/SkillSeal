import { Schema, model, Document, Types } from 'mongoose';

export interface IViolationLog {
  eventType: string;
  timestamp: Date;
  details?: string;
}

export interface ISessionDocument extends Document {
  userId: Types.ObjectId;
  skillId: Types.ObjectId;
  declaredTier: string;
  finalTier: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  status: 'active' | 'completed' | 'terminated' | 'expired';
  terminationReason: string;
  compositeScore: number;
  conceptScore: number;
  speedScore: number;
  consistencyScore: number;
  behaviorScore: number;
  aiScore: number;
  aiProbability: number;
  strikeCount: number;
  violationLog: IViolationLog[];
  verificationId: Types.ObjectId | null;
  // V2 reserved:
  // sessionReplayBlobRef: string;
  createdAt: Date;
  updatedAt: Date;
}

const ViolationLogSchema = new Schema<IViolationLog>(
  {
    eventType: { type: String, required: true },
    timestamp: { type: Date, required: true },
    details: { type: String },
  },
  { _id: false }
);

const SessionSchema = new Schema<ISessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    skillId: { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
    declaredTier: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      required: true,
    },
    finalTier: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert', ''],
      default: '',
    },
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date },
    durationMs: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['active', 'completed', 'terminated', 'expired'],
      default: 'active',
    },
    terminationReason: { type: String, default: '' },

    // ── Composite scoring breakdown ─────────────────────────
    compositeScore: { type: Number, default: 0, min: 0, max: 100 },
    conceptScore: { type: Number, default: 0, min: 0, max: 100 },
    speedScore: { type: Number, default: 0, min: 0, max: 100 },
    consistencyScore: { type: Number, default: 0, min: 0, max: 100 },
    behaviorScore: { type: Number, default: 0, min: 0, max: 100 },

    // ── AI-assist detection ─────────────────────────────────
    aiScore: { type: Number, default: 0, min: 0, max: 100 },
    aiProbability: { type: Number, default: 0, min: 0, max: 1 },

    // ── Anti-cheat ─────────────────────────────────────────
    strikeCount: { type: Number, default: 0, min: 0 },
    violationLog: [ViolationLogSchema],

    verificationId: { type: Schema.Types.ObjectId, ref: 'Verification', default: null },

    // V2 reserved (uncomment when ready):
    // sessionReplayBlobRef: { type: String, select: false },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────

SessionSchema.index({ userId: 1, skillId: 1 });
SessionSchema.index({ status: 1, createdAt: -1 });
// SCHEMA BUG 8: auto-expire abandoned sessions (user closed tab mid-assessment).
// MongoDB TTL + partialFilterExpression requires MongoDB 4.4+.
// Documents with status:'active' are deleted 2 hours after createdAt.
SessionSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 7200,
    partialFilterExpression: { status: 'active' },
  },
);

export const Session = model<ISessionDocument>('Session', SessionSchema);
