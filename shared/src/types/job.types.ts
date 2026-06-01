// ─────────────────────────────────────────────────────────────────────────────
// job.types.ts
// Shared job board & application types for SkillSeal client & server
// ─────────────────────────────────────────────────────────────────────────────

import type { SkillTier } from './verification.types';

// ── Enumerations ──────────────────────────────────────────────────────────────

export type EmploymentType =
  | 'full-time'
  | 'part-time'
  | 'contract'
  | 'freelance'
  | 'internship';

export type WorkType = 'remote' | 'hybrid' | 'on-site';

export type JobStatus = 'active' | 'closed' | 'draft';

export type ApplicationStatus =
  | 'submitted'
  | 'viewed'
  | 'shortlisted'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'withdrawn';

export type PipelineStatus =
  | 'new'
  | 'screening'
  | 'technical'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected';

// ── Required skill spec ───────────────────────────────────────────────────────

export interface IRequiredSkill {
  skillId: string;
  skillName: string;      // denormalised for display
  skillSlug: string;
  tier: SkillTier;
  required: boolean;      // false = nice-to-have
}

// ── Salary range ──────────────────────────────────────────────────────────────

export interface ISalaryRange {
  min: number;
  max: number;
  currency: string;       // ISO 4217 e.g. 'USD'
}

// ── Company mini (denormalised for cards) ─────────────────────────────────────

export interface IJobCompany {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  industry: string;
  size: string;
}

// ── Full job (detail view) ────────────────────────────────────────────────────

export interface IJob {
  _id: string;
  company: IJobCompany;
  recruiterId: string;
  title: string;
  description: string;
  employmentType: EmploymentType;
  workType: WorkType;
  location: string;
  salary: ISalaryRange;
  requiredSkills: IRequiredSkill[];
  easyApply: boolean;
  externalUrl: string;
  status: JobStatus;
  deadline: string | null;        // ISO date string
  postedAt: string;               // ISO date string
  applicantCount: number;         // shown to recruiters only
  hasApplied: boolean;            // relative to the requesting user
  matchScore: number | null;      // 0–100 skill match, null if not computed
  createdAt: string;
  updatedAt: string;
}

// ── Job card (search result / feed summary) ───────────────────────────────────

export interface IJobCard {
  _id: string;
  company: Pick<IJobCompany, '_id' | 'name' | 'logo' | 'industry'>;
  title: string;
  employmentType: EmploymentType;
  workType: WorkType;
  location: string;
  salary: ISalaryRange;
  requiredSkills: Pick<IRequiredSkill, 'skillName' | 'tier' | 'required'>[];
  easyApply: boolean;
  postedAt: string;
  deadline: string | null;
  hasApplied: boolean;
  matchScore: number | null;
}

// ── Job application ───────────────────────────────────────────────────────────

export interface IApplication {
  _id: string;
  jobId: string;
  jobTitle: string;               // denormalised
  companyName: string;            // denormalised
  applicantId: string;
  coverLetter: string;
  resumeUrl: string;
  status: ApplicationStatus;
  pipelineStatus: PipelineStatus;
  appliedAt: string;
  lastUpdatedAt: string;
  notes: string;                  // recruiter-only notes
}

// ── Pipeline status (kanban column) ──────────────────────────────────────────

export interface IPipelineStatus {
  label: PipelineStatus;
  displayName: string;
  color: string;                  // hex color for kanban UI
  order: number;                  // column order (0-indexed)
}

export const PIPELINE_STAGES: IPipelineStatus[] = [
  { label: 'new', displayName: 'New', color: '#94a3b8', order: 0 },
  { label: 'screening', displayName: 'Screening', color: '#60a5fa', order: 1 },
  { label: 'technical', displayName: 'Technical', color: '#a78bfa', order: 2 },
  { label: 'interview', displayName: 'Interview', color: '#fb923c', order: 3 },
  { label: 'offer', displayName: 'Offer', color: '#34d399', order: 4 },
  { label: 'hired', displayName: 'Hired', color: '#4ade80', order: 5 },
  { label: 'rejected', displayName: 'Rejected', color: '#f87171', order: 6 },
];
