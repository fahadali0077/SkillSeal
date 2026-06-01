export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface ISkill {
  _id: string;
  userId: string;
  name: string;
  category: string;
  level: SkillLevel;
  verificationStatus: VerificationStatus;
  verifiedAt?: string;
  endorsements: IEndorsement[];
  endorsementCount: number;
  aiScore?: number;
  aiVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IEndorsement {
  _id?: string;
  endorserId: string;
  endorserName: string;
  endorserAvatarUrl?: string;
  message?: string;
  createdAt: string;
}

export interface ISkillCreatePayload {
  name: string;
  category: string;
  level: SkillLevel;
}

export interface ISkillCategory {
  id: string;
  name: string;
  subcategories: string[];
}
