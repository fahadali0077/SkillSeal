// ─────────────────────────────────────────────────────────────────────────────
// verification.types.ts
// Shared verification & certification types for SkillSeal client & server
// ─────────────────────────────────────────────────────────────────────────────

// ── Enumerations ──────────────────────────────────────────────────────────────

export type VerificationStatus =
  | 'VERIFIED'
  | 'FLAGGED'
  | 'EXPIRED'
  | 'REVOKED';

export type SkillTier =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';

export type QuestionType =
  | 'mcq'
  | 'scenario'
  | 'micro-theory';

export type SessionStatus =
  | 'active'
  | 'completed'
  | 'terminated'
  | 'expired';

// ── Score breakdown ───────────────────────────────────────────────────────────

export interface IScoreBreakdown {
  compositeScore: number;   // 0–100 weighted final score
  conceptScore: number;     // 0–100 correctness on concept questions
  speedScore: number;       // 0–100 normalized response time score
  consistencyScore: number; // 0–100 variance across difficulty levels
  behaviorScore: number;    // 0–100 anti-cheat behavioral signal
  aiScore: number;          // 0–100 AI-assist suspicion score
  aiProbability: number;    // 0–1 raw probability from classifier
}

// ── Verification record ───────────────────────────────────────────────────────

export interface IVerification {
  _id: string;
  userId: string;
  skillId: string;
  skillName: string;        // denormalised
  skillSlug: string;        // denormalised
  tier: SkillTier;
  scores: IScoreBreakdown;
  sessionId: string;
  certificateId: string;
  issuedAt: string;         // ISO date string
  expiresAt: string;        // ISO date string
  status: VerificationStatus;
  flagReason: string;
  createdAt: string;
  updatedAt: string;
}

// ── Certificate ───────────────────────────────────────────────────────────────

export interface ICertificate {
  certificateId: string;
  certificateHash: string;  // SHA-256 for integrity verification
  userId: string;
  userFullName: string;
  skillName: string;
  tier: SkillTier;
  compositeScore: number;
  issuedAt: string;
  expiresAt: string;
  status: VerificationStatus;
  verificationUrl: string;  // public shareable URL
}

// ── Client-safe session state ─────────────────────────────────────────────────
// Sent to the browser during an active assessment.
// Does NOT include correct answers, server-side AI scores, or raw probabilities.

export interface ISessionState {
  sessionId: string;
  skillId: string;
  skillName: string;
  declaredTier: SkillTier;
  status: SessionStatus;
  startTime: string;          // ISO date string
  currentQuestionIndex: number;
  totalQuestions: number;
  timeRemainingMs: number;
  strikeCount: number;
  maxStrikes: number;         // threshold before auto-termination
  answeredCount: number;
  timeoutCount: number;
}
