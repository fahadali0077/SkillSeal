import { Schema, model, Document, Types } from 'mongoose';

export interface IRequiredSkill {
  skillId: Types.ObjectId;
  tier: string;
  required: boolean;
}

export interface IJobDocument extends Document {
  companyId: Types.ObjectId;
  recruiterId: Types.ObjectId;
  title: string;
  description: string;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';
  workType: 'remote' | 'hybrid' | 'on-site';
  location: string;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  requiredSkills: IRequiredSkill[];
  easyApply: boolean;
  externalUrl: string;
  status: 'active' | 'closed' | 'draft';
  deadline: Date | null;
  postedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RequiredSkillSchema = new Schema<IRequiredSkill>(
  {
    skillId: { type: Schema.Types.ObjectId, ref: 'Skill', required: true },
    tier: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      required: true,
    },
    required: { type: Boolean, default: true },
  },
  { _id: false }
);

const JobSchema = new Schema<IJobDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    recruiterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, trim: true, required: true, maxlength: 200 },
    description: { type: String, trim: true, required: true, maxlength: 20000 },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'freelance', 'internship'],
      required: true,
    },
    workType: {
      type: String,
      enum: ['remote', 'hybrid', 'on-site'],
      required: true,
    },
    location: { type: String, trim: true, default: '' },
    salaryMin: { type: Number, default: 0, min: 0 },
    salaryMax: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'USD', uppercase: true, maxlength: 3 },
    requiredSkills: [RequiredSkillSchema],
    easyApply: { type: Boolean, default: true },
    externalUrl: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'closed', 'draft'],
      default: 'draft',
    },
    deadline: { type: Date, default: null },
    postedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────

JobSchema.index({ status: 1, postedAt: -1 });
JobSchema.index({ 'requiredSkills.skillId': 1, 'requiredSkills.tier': 1 });

export const Job = model<IJobDocument>('Job', JobSchema);
