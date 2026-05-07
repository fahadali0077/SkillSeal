// assessment.types.ts — shared types for the SkillSeal skill assessment engine

export type QuestionDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type AntiCheatEventType = 'tab-switch' | 'window-blur' | 'paste-attempt' | 'window-focus';

/** What the CLIENT receives — NO correctAnswer */
export interface IQuestion {
  _id: string;
  questionType: 'mcq' | 'scenario' | 'micro-theory';
  text: string;
  options: string[] | null;
  timeLimitMs: number;
  difficulty: QuestionDifficulty;
  concept?: string;
  tier?: string;
  skillId?: string;
  pointValue?: number;
  hint?: string | null;
}

/** Server-only — includes correct answer and eval criteria */
export interface IQuestionMutation extends IQuestion {
  correctAnswer?: string;
  explanation?: string;
  aiEvalCriteria?: string;
  authorId?: string;
  isActive?: boolean;
  reportCount?: number;
}

export interface IAnswerSubmission {
  sessionId: string;
  questionId: string;
  selectedOption?: 'A' | 'B' | 'C' | 'D';
  textAnswer?: string;
  timeTaken: number;
  isTimeout: boolean;
}

export interface IAntiCheatEvent {
  sessionId: string;
  eventType: AntiCheatEventType;
  questionId: string;
  timeOnQuestion?: number;
}

export interface IAnswerResult {
  accepted: boolean;
  sessionComplete: boolean;
  currentStrikeCount: number;
}

export interface ISessionResult {
  status: 'verified' | 'partial' | 'not_certified' | 'terminated';
  compositeScore: number;
  conceptScore: number;
  speedScore: number;
  consistencyScore: number;
  behaviorScore: number;
  aiScore: number;
  aiProbability: number;
  finalTier: string | null;
  retakeAfterDays: number;
  certificateId?: string;
  verificationId?: string;
}
