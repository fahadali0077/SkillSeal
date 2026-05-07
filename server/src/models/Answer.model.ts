import { Schema, model, Document, Types } from 'mongoose';

export interface IAnswerDocument extends Document {
  sessionId: Types.ObjectId;
  questionId: Types.ObjectId;
  questionType: 'mcq' | 'scenario' | 'micro-theory';
  difficulty: 'easy' | 'medium' | 'hard';
  selectedOption: string | null;
  textAnswer: string;
  isTimeout: boolean;
  isCorrect: boolean | null;
  conceptScore: number;
  aiScore: number;
  timeTaken: number;
  submittedAt: Date;
  serverTimestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IAnswerDocument>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    questionType: {
      type: String,
      enum: ['mcq', 'scenario', 'micro-theory'],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
    },

    // ── Answer content ───────────────────────────────────────
    selectedOption: { type: String, default: null },   // for mcq / scenario
    textAnswer: { type: String, default: '' },          // for micro-theory

    // ── Outcome ──────────────────────────────────────────────
    isTimeout: { type: Boolean, default: false },
    isCorrect: { type: Boolean, default: null },        // null = not yet evaluated

    // ── Scoring (0–1 normalised) ─────────────────────────────
    conceptScore: { type: Number, default: 0, min: 0, max: 1 },
    aiScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
      // Only populated for micro-theory answers
    },

    // ── Timing ──────────────────────────────────────────────
    timeTaken: { type: Number, default: 0, min: 0 },   // ms
    submittedAt: { type: Date, required: true },
    serverTimestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────

AnswerSchema.index({ sessionId: 1 });
AnswerSchema.index({ sessionId: 1, questionType: 1 });

export const Answer = model<IAnswerDocument>('Answer', AnswerSchema);
