import { Schema, model, Document, Types } from 'mongoose';

// ── Embedded sub-schemas ──────────────────────────────────────

const SkillEntrySchema = new Schema(
  {
    skillId: { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
    status: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'expired', 'flagged'],
      default: 'unverified',
    },
    verificationId: { type: Schema.Types.ObjectId, ref: 'Verification', default: null },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const LinkSchema = new Schema(
  {
    label: { type: String, trim: true },
    url: { type: String, trim: true },
    type: {
      type: String,
      enum: ['github', 'linkedin', 'portfolio', 'twitter', 'other'],
      default: 'other',
    },
  },
  { _id: false }
);

const StartDateSchema = new Schema({ month: Number, year: Number }, { _id: false });
const EndDateSchema = new Schema(
  { month: Number, year: Number, isCurrent: { type: Boolean, default: false } },
  { _id: false }
);

const ExperienceSchema = new Schema(
  {
    title: { type: String, trim: true },
    company: { type: String, trim: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'freelance', 'internship', 'volunteer', 'other'],
    },
    startDate: StartDateSchema,
    endDate: EndDateSchema,
    location: { type: String, trim: true },
    description: { type: String, maxlength: 2000 },
    skillsUsed: [{ type: Schema.Types.ObjectId, ref: 'Skill' }],
  },
  { _id: true }
);

const EducationSchema = new Schema(
  {
    institution: { type: String, trim: true },
    degree: { type: String, trim: true },
    field: { type: String, trim: true },
    startYear: Number,
    endYear: Number,
    inProgress: { type: Boolean, default: false },
    grade: { type: String, trim: true },
    description: { type: String, maxlength: 1000 },
  },
  { _id: true }
);

// ── Main interface ─────────────────────────────────────────────

export interface IUserDocument extends Document {
  email: string;
  passwordHash: string;
  role: 'candidate' | 'recruiter' | 'company_admin' | 'platform_admin';
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  headline: string;
  summary: string;
  location: { city?: string; country?: string };
  profilePhoto: string;
  bannerImage: string;
  customUrl: string;
  openToWork: boolean;
  isHiring: boolean;
  accountType: 'free' | 'pro' | 'recruiter';
  connections: Types.ObjectId[];
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
  blockedUsers: Types.ObjectId[];
  skills: {
    skillId: Types.ObjectId;
    status: 'unverified' | 'pending' | 'verified' | 'expired' | 'flagged';
    verificationId: Types.ObjectId | null;
    addedAt: Date;
  }[];
  links: { label: string; url: string; type: string }[];
  experience: {
    title: string;
    company: string;
    companyId: Types.ObjectId | null;
    employmentType: string;
    startDate: { month: number; year: number };
    endDate: { month: number; year: number; isCurrent: boolean };
    location: string;
    description: string;
    skillsUsed: Types.ObjectId[];
  }[];
  education: {
    institution: string;
    degree: string;
    field: string;
    startYear: number;
    endYear: number;
    inProgress: boolean;
    grade: string;
    description: string;
  }[];
  tokenVersion: number;
  // Billing
  stripeCustomerId?: string;
  subscriptionStatus?: string;
  currentPeriodEnd?: Date;
  additionalAssessmentCredits: number;
  // Denormalized for fast recruiter search
  verifiedSkillsSummary: Array<{
    skillId: unknown;
    skillName: string;
    skillSlug: string;
    tier: string;
    compositeScore: number;
    issuedAt: Date;
  }>;
  // V2 reserved:
  // keystrokeSamples: any[];
  // typingProfile: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────

const UserSchema = new Schema<IUserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['candidate', 'recruiter', 'company_admin', 'platform_admin'],
      default: 'candidate',
    },
    emailVerified: { type: Boolean, default: false },
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true, required: true },
    headline: { type: String, trim: true, maxlength: 220, default: '' },
    summary: { type: String, trim: true, maxlength: 2600, default: '' },
    location: {
      city: { type: String, trim: true },
      country: { type: String, trim: true },
    },
    profilePhoto: { type: String, default: '' },
    bannerImage: { type: String, default: '' },
    customUrl: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    openToWork: { type: Boolean, default: false },
    isHiring: { type: Boolean, default: false },
    accountType: { type: String, enum: ['free', 'pro', 'recruiter'], default: 'free' },
    connections: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    skills: [SkillEntrySchema],
    links: [LinkSchema],
    experience: [ExperienceSchema],
    education: [EducationSchema],
    tokenVersion: { type: Number, default: 0 },
    // Billing
    stripeCustomerId: { type: String, select: false },
    subscriptionStatus: { type: String, default: '' },
    currentPeriodEnd: { type: Date },
    additionalAssessmentCredits: { type: Number, default: 0 },
    // Denormalized verified skills for recruiter search
    verifiedSkillsSummary: [{
      skillId: { type: Schema.Types.ObjectId, ref: 'Skill' },
      skillName: { type: String, default: '' },
      skillSlug: { type: String, default: '' },
      tier: { type: String, default: '' },
      compositeScore: { type: Number, default: 0 },
      issuedAt: { type: Date },
    }],
    // V2 reserved (uncomment when ready):
    // keystrokeSamples: { type: [Schema.Types.Mixed], select: false },
    // typingProfile: { type: Schema.Types.Mixed, select: false },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────

UserSchema.index({ 'location.city': 1, 'location.country': 1 });
UserSchema.index({ 'skills.skillId': 1, 'skills.status': 1 });
UserSchema.index({ openToWork: 1, accountType: 1 });

// ── Virtual: fullName ─────────────────────────────────────────

UserSchema.virtual('fullName').get(function (this: IUserDocument) {
  return `${this.firstName} ${this.lastName}`;
});

export const User = model<IUserDocument>('User', UserSchema);
