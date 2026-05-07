export type VerificationMethod = 'ai_quiz' | 'peer_review' | 'portfolio' | 'certificate';

export type VerificationResult = 'pass' | 'fail' | 'inconclusive';

export interface IVerification {
  _id: string;
  userId: string;
  skillId: string;
  method: VerificationMethod;
  result?: VerificationResult;
  score?: number;
  maxScore?: number;
  percentile?: number;
  questions?: IVerificationQuestion[];
  answers?: IVerificationAnswer[];
  aiEvaluation?: string;
  reviewerId?: string;
  portfolioUrl?: string;
  certificateUrl?: string;
  completedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IVerificationQuestion {
  _id: string;
  question: string;
  options?: string[];
  type: 'multiple_choice' | 'open_ended' | 'code_challenge';
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface IVerificationAnswer {
  questionId: string;
  answer: string;
  isCorrect?: boolean;
  aiFeedback?: string;
}

export interface IStartVerificationPayload {
  skillId: string;
  method: VerificationMethod;
}

export interface ISubmitVerificationPayload {
  verificationId: string;
  answers: IVerificationAnswer[];
}
