// ─────────────────────────────────────────────────────────────────────────────
// jobs.service.ts
// Job search with relevance scoring, CRUD, applications, recruiter pipeline.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Types, type FilterQuery } from 'mongoose';
import { Job } from '../models/Job.model';
import type { IJobDocument } from '../models/Job.model';
import { Application } from '../models/Application.model';
import type { IApplicationDocument, AppStatus } from '../models/Application.model';
import { Company } from '../models/Company.model';
import type { ICompanyDocument } from '../models/Company.model';
import { User } from '../models/User.model';
import type { IUserDocument } from '../models/User.model';
import { Skill } from '../models/Skill.model';
import type { ISkillDocument } from '../models/Skill.model';
import { AppError } from '../middleware/error.middleware';
import { emitToUser, SOCKET_EVENTS } from '../socket/socket';
import logger from '../utils/logger';
import type {
  IJob, IJobCard, IApplication, IJobCompany, IRequiredSkill,
  EmploymentType, WorkType, JobStatus,
} from '@SkillSeal/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getCompanyMini(companyId: Types.ObjectId): Promise<IJobCompany> {
  const c = await Company.findById(companyId).lean<ICompanyDocument>();
  if (!c) return { _id: companyId.toString(), name: 'Unknown', slug: '', logo: '', industry: '', size: '' };
  return { _id: c._id.toString(), name: c.name, slug: c.slug, logo: c.logo ?? '', industry: c.industry ?? '', size: c.size ?? '' };
}

async function enrichSkills(
  requiredSkills: { skillId: Types.ObjectId; tier: string; required: boolean }[],
): Promise<IRequiredSkill[]> {
  const ids = requiredSkills.map((s) => s.skillId);
  const skillDocs = await Skill.find({ _id: { $in: ids } }).lean<ISkillDocument[]>();
  const map = new Map(skillDocs.map((s) => [s._id.toString(), s]));

  return requiredSkills.map((s) => {
    const sk = map.get(s.skillId.toString());
    return {
      skillId: s.skillId.toString(),
      skillName: sk?.name ?? '',
      skillSlug: sk?.slug ?? '',
      tier: s.tier as IRequiredSkill['tier'],
      required: s.required,
    };
  });
}

/**
 * Computes a relevance match score for a candidate against a job.
 *   verified skill match   → +2 per skill
 *   unverified skill match → +0.5 per skill
 *   location match         → +1
 *   employment type match  → +0.5
 * Normalised to 0–100.
 */
// HIGH-06: exported so users.service.ts searchUsers() can compute a real
// match score for a candidate against a specific job, rather than the previous
// naive `Math.min(100, verifiedSkills.length * 20)` heuristic.
export async function computeMatchScore(
  jobDoc: IJobDocument,
  viewer?: IUserDocument,
): Promise<number> {
  if (!viewer) return 0;

  let score = 0;
  const maxPossible = jobDoc.requiredSkills.length * 2 + 1.5;
  if (maxPossible === 0) return 0;

  const candidateSkillIds = new Map(
    viewer.skills.map((s) => [s.skillId.toString(), s.status]),
  );

  for (const req of jobDoc.requiredSkills) {
    const status = candidateSkillIds.get(req.skillId.toString());
    if (!status) continue;
    score += status === 'verified' ? 2 : 0.5;
  }

  // Location match (simple substring)
  if (
    jobDoc.location &&
    viewer.location?.city &&
    jobDoc.location.toLowerCase().includes(viewer.location.city.toLowerCase())
  ) score += 1;

  // Employment type — skip if no preference stored; award 0.5 if first experience type matches
  if (viewer.experience?.[0]?.employmentType === jobDoc.employmentType) score += 0.5;

  return Math.min(100, Math.round((score / maxPossible) * 100));
}

async function serializeJob(
  doc: IJobDocument,
  viewer?: IUserDocument,
  matchScore?: number,
): Promise<IJob> {
  const company = await getCompanyMini(doc.companyId);
  const requiredSkills = await enrichSkills(doc.requiredSkills as { skillId: Types.ObjectId; tier: string; required: boolean }[]);
  const ms = matchScore ?? await computeMatchScore(doc, viewer);

  return {
    _id: doc._id.toString(),
    company,
    recruiterId: doc.recruiterId.toString(),
    title: doc.title,
    description: doc.description,
    employmentType: doc.employmentType as EmploymentType,
    workType: doc.workType as WorkType,
    location: doc.location,
    salary: { min: doc.salaryMin ?? 0, max: doc.salaryMax ?? 0, currency: doc.currency ?? 'USD' },
    requiredSkills,
    easyApply: doc.easyApply,
    externalUrl: doc.externalUrl ?? '',
    status: doc.status as JobStatus,
    deadline: doc.deadline?.toISOString() ?? null,
    postedAt: (doc.postedAt ?? doc.createdAt).toISOString(),
    applicantCount: 0,
    hasApplied: false,
    matchScore: ms,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function toJobCard(job: IJob): IJobCard {
  return {
    _id: job._id,
    company: { _id: job.company._id, name: job.company.name, logo: job.company.logo, industry: job.company.industry },
    title: job.title,
    employmentType: job.employmentType,
    workType: job.workType,
    location: job.location,
    salary: job.salary,
    requiredSkills: job.requiredSkills.map((s) => ({ skillName: s.skillName, tier: s.tier, required: s.required })),
    easyApply: job.easyApply,
    postedAt: job.postedAt,
    deadline: job.deadline,
    hasApplied: job.hasApplied,
    matchScore: job.matchScore,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Search / list jobs
// ─────────────────────────────────────────────────────────────────────────────

export interface JobSearchParams {
  keyword?: string;
  skill?: string;
  tier?: string;
  verifiedOnly?: boolean;
  location?: string;
  workType?: string;
  employmentType?: string;
  salaryMin?: number;
  datePosted?: 'any' | 'week' | 'month';
  sort?: 'relevant' | 'recent' | 'salary';
  page?: number;
  limit?: number;
}

export async function searchJobs(
  params: JobSearchParams,
  viewerId?: string,
): Promise<{ jobs: IJobCard[]; total: number; page: number; totalPages: number }> {
  const {
    keyword, skill, tier, verifiedOnly, location,
    workType, employmentType, salaryMin,
    datePosted = 'any', sort = 'recent',
    page = 1, limit = 20,
  } = params;

  const filter: FilterQuery<IJobDocument> = { status: 'active' };

  if (keyword) {
    filter['$or'] = [
      { title: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
    ];
  }

  if (location) filter['location'] = { $regex: location, $options: 'i' };
  if (workType) filter['workType'] = workType;
  if (employmentType) filter['employmentType'] = employmentType;
  if (salaryMin) filter['salaryMin'] = { $gte: salaryMin };

  if (datePosted !== 'any') {
    const daysAgo = datePosted === 'week' ? 7 : 30;
    filter['postedAt'] = { $gte: new Date(Date.now() - daysAgo * 86400000) };
  }

  if (skill) {
    const skillDoc = await Skill.findOne({ $or: [{ slug: skill }, { name: { $regex: skill, $options: 'i' } }] }).lean<ISkillDocument>();
    if (skillDoc) {
      const skillFilter: Record<string, unknown> = { 'requiredSkills.skillId': skillDoc._id };
      if (tier) skillFilter['requiredSkills.tier'] = tier;
      Object.assign(filter, skillFilter);
    }
  }

  const skip = (page - 1) * limit;

  let sortOpt: Record<string, 1 | -1> = { postedAt: -1 };
  if (sort === 'salary') sortOpt = { salaryMax: -1, salaryMin: -1 };

  const [docs, total] = await Promise.all([
    Job.find(filter).sort(sortOpt).skip(skip).limit(Math.min(limit, 50)).lean<IJobDocument[]>(),
    Job.countDocuments(filter),
  ]);

  // Load viewer for match scoring
  const viewer = viewerId
    ? await User.findById(viewerId).lean<IUserDocument>()
    : null;

  // Applied job ids
  const appliedIds = viewerId
    ? new Set(
      (await Application.find({ candidateId: viewerId, jobId: { $in: docs.map((d) => d._id) } })
        .select('jobId').lean<{ jobId: Types.ObjectId }[]>())
        .map((a) => a.jobId.toString()),
    )
    : new Set<string>();

  // Score and serialize
  const scored = await Promise.all(
    docs.map(async (doc) => {
      const ms = await computeMatchScore(doc, viewer ?? undefined);
      const job = await serializeJob(doc, viewer ?? undefined, ms);
      job.hasApplied = appliedIds.has(doc._id.toString());
      return { job, ms };
    }),
  );

  // Sort by relevance if requested
  if (sort === 'relevant') {
    scored.sort((a, b) => b.ms - a.ms);
  }

  return {
    jobs: scored.map(({ job }) => toJobCard(job)),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Get single job
// ─────────────────────────────────────────────────────────────────────────────

export async function getJob(jobId: string, viewerId?: string): Promise<IJob> {
  if (!mongoose.Types.ObjectId.isValid(jobId)) throw new AppError('Invalid job ID.', 400, true);
  const doc = await Job.findOne({ _id: jobId, status: { $ne: 'draft' } }).lean<IJobDocument>();
  if (!doc) throw new AppError('Job not found.', 404, true);

  const viewer = viewerId ? await User.findById(viewerId).lean<IUserDocument>() : null;
  const ms = await computeMatchScore(doc, viewer ?? undefined);
  const job = await serializeJob(doc, viewer ?? undefined, ms);

  if (viewerId) {
    const app = await Application.findOne({ jobId, candidateId: viewerId }).lean();
    job.hasApplied = !!app;
  }

  // Applicant count for recruiter
  job.applicantCount = await Application.countDocuments({ jobId });

  return job;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Create job
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateJobInput {
  companyId: string;
  title: string;
  description: string;
  employmentType: EmploymentType;
  workType: WorkType;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  requiredSkills: { skillId: string; tier: string; required: boolean }[];
  easyApply: boolean;
  externalUrl?: string;
  deadline?: string;
}

export async function createJob(recruiterId: string, input: CreateJobInput): Promise<IJob> {
  const doc = await Job.create({
    companyId: new Types.ObjectId(input.companyId),
    recruiterId: new Types.ObjectId(recruiterId),
    title: input.title,
    description: input.description,
    employmentType: input.employmentType,
    workType: input.workType,
    location: input.location,
    salaryMin: input.salaryMin ?? 0,
    salaryMax: input.salaryMax ?? 0,
    currency: input.currency ?? 'USD',
    requiredSkills: input.requiredSkills.map((s) => ({
      skillId: new Types.ObjectId(s.skillId),
      tier: s.tier,
      required: s.required,
    })),
    easyApply: input.easyApply,
    externalUrl: input.externalUrl ?? '',
    deadline: input.deadline ? new Date(input.deadline) : null,
    status: 'active',
    postedAt: new Date(),
  });

  logger.info(`[jobs] Created job: ${doc._id} by recruiter=${recruiterId}`);
  return serializeJob(doc as IJobDocument);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Update job
// ─────────────────────────────────────────────────────────────────────────────

export async function updateJob(
  jobId: string,
  recruiterId: string,
  patch: Partial<CreateJobInput & { status: JobStatus }>,
): Promise<IJob> {
  const doc = await Job.findOne({ _id: jobId, recruiterId: new Types.ObjectId(recruiterId) });
  if (!doc) throw new AppError('Job not found or you do not own it.', 404, true);

  const { status, requiredSkills, companyId: _c, ...rest } = patch;

  Object.assign(doc, rest);
  if (status) doc.status = status;
  if (requiredSkills) {
    doc.requiredSkills = requiredSkills.map((s) => ({
      skillId: new Types.ObjectId(s.skillId),
      tier: s.tier,
      required: s.required,
    })) as IJobDocument['requiredSkills'];
  }

  await doc.save();
  return serializeJob(doc as IJobDocument);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Easy Apply
// ─────────────────────────────────────────────────────────────────────────────

export async function applyToJob(
  jobId: string,
  candidateId: string,
  coverNote?: string,
): Promise<{ applicationId: string }> {
  const job = await Job.findOne({ _id: jobId, status: 'active', easyApply: true }).lean<IJobDocument>();
  if (!job) throw new AppError('Job not found or not accepting Easy Apply.', 404, true);

  const existing = await Application.findOne({ jobId, candidateId });
  if (existing) throw new AppError('You have already applied to this job.', 409, true);

  const app = await Application.create({
    jobId: new Types.ObjectId(jobId),
    candidateId: new Types.ObjectId(candidateId),
    recruiterId: job.recruiterId,
    companyId: job.companyId,
    coverNote: coverNote?.slice(0, 500) ?? '',
    appliedAt: new Date(),
    status: 'applied',
  });

  // Notify recruiter
  emitToUser(job.recruiterId.toString(), SOCKET_EVENTS.NOTIFICATION, {
    type: 'new_application',
    payload: { jobId, jobTitle: job.title, candidateId, applicationId: app._id.toString() },
  });

  logger.info(`[jobs] Application: candidateId=${candidateId} jobId=${jobId}`);
  return { applicationId: app._id.toString() };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Candidate applications
// ─────────────────────────────────────────────────────────────────────────────

export interface IApplicationOut {
  _id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  companyLogo: string;
  status: string;
  coverNote: string;
  appliedAt: string;
  updatedAt: string;
  matchScore: number;
}

export async function getMyApplications(candidateId: string): Promise<IApplicationOut[]> {
  const apps = await Application.find({ candidateId: new Types.ObjectId(candidateId) })
    .sort({ appliedAt: -1 })
    .lean<IApplicationDocument[]>();

  const jobIds = apps.map((a) => a.jobId);
  const jobs = await Job.find({ _id: { $in: jobIds } }).lean<IJobDocument[]>();
  const jobMap = new Map(jobs.map((j) => [j._id.toString(), j]));

  const companyIds = jobs.map((j) => j.companyId);
  const companies = await Company.find({ _id: { $in: companyIds } }).lean<ICompanyDocument[]>();
  const compMap = new Map(companies.map((c) => [c._id.toString(), c]));

  const viewer = await User.findById(candidateId).lean<IUserDocument>();

  return Promise.all(apps.map(async (app) => {
    const job = jobMap.get(app.jobId.toString());
    const comp = job ? compMap.get(job.companyId.toString()) : null;
    const ms = job && viewer ? await computeMatchScore(job, viewer) : 0;
    return {
      _id: app._id.toString(),
      jobId: app.jobId.toString(),
      jobTitle: job?.title ?? '',
      companyName: comp?.name ?? '',
      companyLogo: comp?.logo ?? '',
      status: app.status,
      coverNote: app.coverNote,
      appliedAt: app.appliedAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
      matchScore: ms,
    };
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Recruiter: all applications for a job
// ─────────────────────────────────────────────────────────────────────────────

export interface IRecruiterApplication {
  _id: string;
  candidateId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  headline: string;
  profilePhoto: string;
  customUrl: string;
  coverNote: string;
  status: string;
  appliedAt: string;
  matchScore: number;
}

export async function getJobApplications(
  jobId: string,
  recruiterId: string,
): Promise<IRecruiterApplication[]> {
  const job = await Job.findOne({ _id: jobId, recruiterId: new Types.ObjectId(recruiterId) }).lean<IJobDocument>();
  if (!job) throw new AppError('Job not found or forbidden.', 404, true);

  const apps = await Application.find({ jobId: new Types.ObjectId(jobId) })
    .sort({ appliedAt: -1 }).lean<IApplicationDocument[]>();

  const candidateIds = apps.map((a) => a.candidateId);
  const candidates = await User.find({ _id: { $in: candidateIds } }).lean<IUserDocument[]>();
  const candMap = new Map(candidates.map((c) => [c._id.toString(), c]));

  return Promise.all(apps.map(async (app) => {
    const cand = candMap.get(app.candidateId.toString());
    const ms = cand ? await computeMatchScore(job, cand) : 0;
    return {
      _id: app._id.toString(),
      candidateId: app.candidateId.toString(),
      firstName: cand?.firstName ?? '',
      lastName: cand?.lastName ?? '',
      fullName: cand ? `${cand.firstName} ${cand.lastName}` : '',
      headline: cand?.headline ?? '',
      profilePhoto: cand?.profilePhoto ?? '',
      customUrl: cand?.customUrl ?? '',
      coverNote: app.coverNote,
      status: app.status,
      appliedAt: app.appliedAt.toISOString(),
      matchScore: ms,
    };
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Update application status
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  shortlisted: 'has shortlisted your application',
  contacted: 'has reached out about your application',
  interviewing: 'has moved your application to interviews',
  offer: 'has extended an offer for your application',
  rejected: 'has updated your application status',
};

export async function updateApplicationStatus(
  appId: string,
  recruiterId: string,
  status: AppStatus,
  note?: string,
): Promise<void> {
  const app = await Application.findOne({ _id: appId, recruiterId: new Types.ObjectId(recruiterId) });
  if (!app) throw new AppError('Application not found or forbidden.', 404, true);

  app.status = status;
  if (note) app.recruiterNote = note;
  await app.save();

  // Fetch job title for notification
  const job = await Job.findById(app.jobId).lean<IJobDocument>();

  // Notify candidate
  emitToUser(app.candidateId.toString(), SOCKET_EVENTS.NOTIFICATION, {
    type: 'application_update',
    payload: {
      applicationId: appId,
      jobId: app.jobId.toString(),
      jobTitle: job?.title ?? '',
      status,
      label: STATUS_LABELS[status] ?? 'has updated your application',
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Pipeline grouped by stage
// ─────────────────────────────────────────────────────────────────────────────

export async function getJobPipeline(
  jobId: string,
  recruiterId: string,
): Promise<Record<AppStatus, IRecruiterApplication[]>> {
  const all = await getJobApplications(jobId, recruiterId);
  const grouped = {} as Record<AppStatus, IRecruiterApplication[]>;

  for (const app of all) {
    const s = app.status as AppStatus;
    grouped[s] = grouped[s] ?? [];
    grouped[s].push(app);
  }

  return grouped;
}
