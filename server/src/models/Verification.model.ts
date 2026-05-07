import { Schema, model, Document, Types } from 'mongoose';

export interface IVerificationDocument extends Document {
  userId: Types.ObjectId;
  skillId: Types.ObjectId;
  tier: string;
  compositeScore: number;
  conceptScore: number;
  speedScore: number;
  consistencyScore: number;
  behaviorScore: number;
  aiScore: number;
  aiProbability: number;
  sessionId: Types.ObjectId;
  certificateId: string;
  certificateHash: string;
  issuedAt: Date;
  expiresAt: Date;
  status: 'VERIFIED' | 'FLAGGED' | 'EXPIRED' | 'REVOKED';
  flagReason: string;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationSchema = new Schema<IVerificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    skillId: { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
    tier: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      required: true,
    },

    // ── Score breakdown ──────────────────────────────────────
    compositeScore: { type: Number, required: true, min: 0, max: 100 },
    conceptScore: { type: Number, default: 0, min: 0, max: 100 },
    speedScore: { type: Number, default: 0, min: 0, max: 100 },
    consistencyScore: { type: Number, default: 0, min: 0, max: 100 },
    behaviorScore: { type: Number, default: 0, min: 0, max: 100 },

    // ── AI-assist detection ──────────────────────────────────
    aiScore: { type: Number, default: 0, min: 0, max: 100 },
    aiProbability: { type: Number, default: 0, min: 0, max: 1 },

    // ── Session reference ────────────────────────────────────
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },

    // ── Certificate ──────────────────────────────────────────
    certificateId: { type: String, required: true, unique: true },
    certificateHash: { type: String, required: true },

    // ── Validity ─────────────────────────────────────────────
    issuedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['VERIFIED', 'FLAGGED', 'EXPIRED', 'REVOKED'],
      default: 'VERIFIED',
    },
    flagReason: { type: String, default: '' },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────

VerificationSchema.index({ userId: 1, skillId: 1 });
VerificationSchema.index({ status: 1, expiresAt: 1 });

export const Verification = model<IVerificationDocument>('Verification', VerificationSchema);
