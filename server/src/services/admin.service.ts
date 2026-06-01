// ─────────────────────────────────────────────────────────────────────────────
// admin.service.ts
// Platform-admin business logic: dashboard analytics, user moderation,
// verification (certificate) oversight, and skill catalog management.
//
// Every function here assumes the caller has already been gated by
// `requireRole('platform_admin')` in the route layer. The `adminId` argument is
// passed through purely for self-protection guards (an admin cannot suspend,
// demote, or delete their own account) and for future audit logging.
// ─────────────────────────────────────────────────────────────────────────────

import { Types } from 'mongoose';
import { User } from '../models/User.model';
import { Verification } from '../models/Verification.model';
import { Session } from '../models/Session.model';
import { Skill } from '../models/Skill.model';
import { Job } from '../models/Job.model';
import { Post } from '../models/Post.model';
import { AppError } from '../middleware/error.middleware';
import logger from '../utils/logger';

// ── Shared shapes ─────────────────────────────────────────────────────────────

const ASSIGNABLE_ROLES = ['candidate', 'recruiter', 'company_admin', 'platform_admin'] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export interface IPaginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function paginate<T>(items: T[], total: number, page: number, limit: number): IPaginated<T> {
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/** Coerce arbitrary query input into safe { page, limit, skip }. */
function pageParams(raw: { page?: unknown; limit?: unknown }, maxLimit = 50) {
  const page = Math.max(1, parseInt(String(raw.page ?? '1'), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(raw.limit ?? '20'), 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

function assertObjectId(id: string, label = 'id'): void {
  if (!Types.ObjectId.isValid(id)) throw new AppError(`Invalid ${label}.`, 400, true);
}

// ── Dashboard analytics ─────────────────────────────────────────────────────────

export interface IAdminStats {
  users: {
    total: number;
    suspended: number;
    byRole: Record<string, number>;
    newLast7d: number;
    newLast30d: number;
  };
  verifications: { total: number; byStatus: Record<string, number> };
  sessions: { total: number; completed: number; terminated: number };
  catalog: { skills: number; activeSkills: number; jobs: number; activeJobs: number; posts: number };
  signupTrend: { date: string; count: number }[];
}

export async function getDashboardStats(): Promise<IAdminStats> {
  const now = Date.now();
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

  // Run everything concurrently — the dashboard is read-heavy and these are all
  // independent count/aggregate queries against indexed fields.
  const [
    totalUsers, suspendedUsers, roleAgg, new7d, new30d,
    totalVerifs, verifStatusAgg,
    totalSessions, completedSessions, terminatedSessions,
    skills, activeSkills, jobs, activeJobs, posts,
    signupAgg,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ status: 'suspended' }),
    User.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.countDocuments({ createdAt: { $gte: d7 } }),
    User.countDocuments({ createdAt: { $gte: d30 } }),
    Verification.countDocuments({}),
    Verification.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Session.countDocuments({}),
    Session.countDocuments({ status: 'completed' }),
    Session.countDocuments({ status: 'terminated' }),
    Skill.countDocuments({}),
    Skill.countDocuments({ isActive: true }),
    Job.countDocuments({}),
    Job.countDocuments({ status: 'active' }),
    Post.countDocuments({ isDeleted: { $ne: true } }),
    // 30-day signup trend, bucketed by calendar day in UTC.
    User.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: d30 } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const byRole: Record<string, number> = {};
  roleAgg.forEach((r) => { byRole[r._id] = r.count; });

  const byStatus: Record<string, number> = {};
  verifStatusAgg.forEach((v) => { byStatus[v._id] = v.count; });

  // Backfill the trend so the chart shows a continuous 30-day axis even on days
  // with zero signups (otherwise recharts collapses the gaps and misleads).
  const trendMap = new Map(signupAgg.map((s) => [s._id, s.count]));
  const signupTrend: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    signupTrend.push({ date: day, count: trendMap.get(day) ?? 0 });
  }

  return {
    users: { total: totalUsers, suspended: suspendedUsers, byRole, newLast7d: new7d, newLast30d: new30d },
    verifications: { total: totalVerifs, byStatus },
    sessions: { total: totalSessions, completed: completedSessions, terminated: terminatedSessions },
    catalog: { skills, activeSkills, jobs, activeJobs, posts },
    signupTrend,
  };
}

// ── User management ─────────────────────────────────────────────────────────────

export interface IAdminUserRow {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  accountType: string;
  emailVerified: boolean;
  profilePhoto: string;
  customUrl: string;
  connectionCount: number;
  suspendedReason: string;
  lastLoginAt: string | null;
  createdAt: string;
}

interface ListUsersQuery {
  page?: unknown; limit?: unknown; search?: unknown;
  role?: unknown; status?: unknown; sortBy?: unknown; sortOrder?: unknown;
}

export async function listUsers(q: ListUsersQuery): Promise<IPaginated<IAdminUserRow>> {
  const { page, limit, skip } = pageParams(q);
  const filter: Record<string, unknown> = {};

  const search = typeof q.search === 'string' ? q.search.trim() : '';
  if (search) {
    // Escape regex metacharacters so a user typing "a.b" can't inject a pattern.
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');
    filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }];
  }
  if (typeof q.role === 'string' && ASSIGNABLE_ROLES.includes(q.role as AssignableRole)) filter.role = q.role;
  if (q.status === 'active' || q.status === 'suspended') filter.status = q.status;

  const sortField = typeof q.sortBy === 'string' && ['createdAt', 'lastLoginAt', 'connectionCount'].includes(q.sortBy)
    ? q.sortBy : 'createdAt';
  const sortDir = q.sortOrder === 'asc' ? 1 : -1;

  const [docs, total] = await Promise.all([
    User.find(filter)
      .select('firstName lastName email role status accountType emailVerified profilePhoto customUrl connectionCount suspendedReason lastLoginAt createdAt')
      .sort({ [sortField]: sortDir })
      .skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  const items: IAdminUserRow[] = docs.map((u) => ({
    _id: u._id.toString(),
    firstName: u.firstName, lastName: u.lastName, email: u.email,
    role: u.role, status: u.status ?? 'active', accountType: u.accountType,
    emailVerified: u.emailVerified, profilePhoto: u.profilePhoto ?? '',
    customUrl: u.customUrl ?? '', connectionCount: u.connectionCount ?? 0,
    suspendedReason: u.suspendedReason ?? '',
    lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
    createdAt: new Date(u.createdAt).toISOString(),
  }));

  return paginate(items, total, page, limit);
}

export interface IAdminUserDetail extends IAdminUserRow {
  headline: string;
  summary: string;
  location: { city?: string; country?: string };
  followerCount: number;
  followingCount: number;
  scheduledDeletionAt: string | null;
  verifications: {
    _id: string; skillName: string; tier: string; compositeScore: number;
    status: string; issuedAt: string; expiresAt: string; certificateId: string;
  }[];
}

export async function getUserDetail(userId: string): Promise<IAdminUserDetail> {
  assertObjectId(userId, 'userId');
  const u = await User.findById(userId).lean();
  if (!u) throw new AppError('User not found.', 404, true);

  const verifs = await Verification.find({ userId: u._id })
    .populate<{ skillId: { name: string } }>('skillId', 'name')
    .sort({ issuedAt: -1 }).limit(50).lean();

  return {
    _id: u._id.toString(),
    firstName: u.firstName, lastName: u.lastName, email: u.email,
    role: u.role, status: u.status ?? 'active', accountType: u.accountType,
    emailVerified: u.emailVerified, profilePhoto: u.profilePhoto ?? '',
    customUrl: u.customUrl ?? '', connectionCount: u.connectionCount ?? 0,
    suspendedReason: u.suspendedReason ?? '',
    lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
    createdAt: new Date(u.createdAt).toISOString(),
    headline: u.headline ?? '', summary: u.summary ?? '',
    location: { city: u.location?.city ?? '', country: u.location?.country ?? '' },
    followerCount: u.followerCount ?? 0, followingCount: u.followingCount ?? 0,
    scheduledDeletionAt: u.scheduledDeletionAt ? new Date(u.scheduledDeletionAt).toISOString() : null,
    verifications: verifs.map((v) => ({
      _id: v._id.toString(),
      skillName: (v.skillId as { name?: string })?.name ?? 'Unknown skill',
      tier: v.tier, compositeScore: v.compositeScore, status: v.status,
      issuedAt: new Date(v.issuedAt).toISOString(),
      expiresAt: new Date(v.expiresAt).toISOString(),
      certificateId: v.certificateId,
    })),
  };
}

export async function updateUserRole(adminId: string, userId: string, role: string): Promise<IAdminUserRow> {
  assertObjectId(userId, 'userId');
  if (!ASSIGNABLE_ROLES.includes(role as AssignableRole)) throw new AppError('Invalid role.', 400, true);
  if (adminId === userId) throw new AppError('You cannot change your own role.', 403, true);

  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404, true);

  user.role = role as IAdminUserRow['role'] & AssignableRole;
  // Bump tokenVersion so the user's existing access/refresh tokens (which embed
  // the old role) are invalidated and the new role takes effect on next login.
  user.tokenVersion += 1;
  await user.save();
  logger.info(`[admin] ${adminId} set role=${role} for user ${userId}`);
  return toRow(user);
}

export async function suspendUser(adminId: string, userId: string, reason: string): Promise<IAdminUserRow> {
  assertObjectId(userId, 'userId');
  if (adminId === userId) throw new AppError('You cannot suspend your own account.', 403, true);

  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404, true);
  if (user.role === 'platform_admin') throw new AppError('Cannot suspend another platform admin.', 403, true);

  user.status = 'suspended';
  user.suspendedReason = (reason ?? '').slice(0, 500);
  user.suspendedAt = new Date();
  // Kill all active sessions immediately — refresh checks tokenVersion.
  user.tokenVersion += 1;
  await user.save();
  logger.info(`[admin] ${adminId} suspended user ${userId} (${reason})`);
  return toRow(user);
}

export async function reactivateUser(adminId: string, userId: string): Promise<IAdminUserRow> {
  assertObjectId(userId, 'userId');
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404, true);

  user.status = 'active';
  user.suspendedReason = '';
  user.suspendedAt = null;
  await user.save();
  logger.info(`[admin] ${adminId} reactivated user ${userId}`);
  return toRow(user);
}

/**
 * Schedules a user for permanent deletion in 30 days (reuses the existing
 * soft-delete fence + permanentDeletion cron). The account is suspended
 * immediately so it can't be used during the grace window. Passing
 * `immediate: true` hard-deletes the document right away.
 */
export async function deleteUser(
  adminId: string, userId: string, immediate = false,
): Promise<{ deleted: boolean; scheduledDeletionAt: string | null }> {
  assertObjectId(userId, 'userId');
  if (adminId === userId) throw new AppError('You cannot delete your own account.', 403, true);

  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404, true);
  if (user.role === 'platform_admin') throw new AppError('Cannot delete another platform admin.', 403, true);

  if (immediate) {
    await User.deleteOne({ _id: user._id });
    logger.warn(`[admin] ${adminId} HARD-deleted user ${userId}`);
    return { deleted: true, scheduledDeletionAt: null };
  }

  const when = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  user.scheduledDeletionAt = when;
  user.status = 'suspended';
  user.suspendedReason = 'Account scheduled for deletion by an administrator.';
  user.suspendedAt = new Date();
  user.tokenVersion += 1;
  await user.save();
  logger.info(`[admin] ${adminId} scheduled deletion of user ${userId} for ${when.toISOString()}`);
  return { deleted: false, scheduledDeletionAt: when.toISOString() };
}

function toRow(u: {
  _id: Types.ObjectId; firstName: string; lastName: string; email: string;
  role: string; status: string; accountType: string; emailVerified: boolean;
  profilePhoto: string; customUrl?: string; connectionCount: number;
  suspendedReason: string; lastLoginAt: Date | null; createdAt: Date;
}): IAdminUserRow {
  return {
    _id: u._id.toString(),
    firstName: u.firstName, lastName: u.lastName, email: u.email,
    role: u.role, status: u.status ?? 'active', accountType: u.accountType,
    emailVerified: u.emailVerified, profilePhoto: u.profilePhoto ?? '',
    customUrl: u.customUrl ?? '', connectionCount: u.connectionCount ?? 0,
    suspendedReason: u.suspendedReason ?? '',
    lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
    createdAt: new Date(u.createdAt).toISOString(),
  };
}

// ── Verification (certificate) oversight ─────────────────────────────────────────

export interface IAdminVerificationRow {
  _id: string;
  userId: string;
  userName: string;
  skillName: string;
  tier: string;
  compositeScore: number;
  aiProbability: number;
  status: string;
  flagReason: string;
  certificateId: string;
  sessionId: string;
  issuedAt: string;
  expiresAt: string;
}

interface ListVerifsQuery { page?: unknown; limit?: unknown; status?: unknown; search?: unknown }

const VERIF_STATUSES = ['VERIFIED', 'FLAGGED', 'EXPIRED', 'REVOKED', 'WITHDRAWN'];

export async function listVerifications(q: ListVerifsQuery): Promise<IPaginated<IAdminVerificationRow>> {
  const { page, limit, skip } = pageParams(q);
  const filter: Record<string, unknown> = {};
  if (typeof q.status === 'string' && VERIF_STATUSES.includes(q.status)) filter.status = q.status;

  const [docs, total] = await Promise.all([
    Verification.find(filter)
      .populate<{ userId: { firstName: string; lastName: string } }>('userId', 'firstName lastName')
      .populate<{ skillId: { name: string } }>('skillId', 'name')
      .sort({ issuedAt: -1 }).skip(skip).limit(limit).lean(),
    Verification.countDocuments(filter),
  ]);

  let items: IAdminVerificationRow[] = docs.map((v) => {
    const u = v.userId as { _id?: Types.ObjectId; firstName?: string; lastName?: string } | null;
    return {
      _id: v._id.toString(),
      userId: u?._id?.toString() ?? '',
      userName: u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : 'Deleted user',
      skillName: (v.skillId as { name?: string })?.name ?? 'Unknown skill',
      tier: v.tier, compositeScore: v.compositeScore, aiProbability: v.aiProbability,
      status: v.status, flagReason: v.flagReason ?? '', certificateId: v.certificateId,
      sessionId: v.sessionId?.toString() ?? '',
      issuedAt: new Date(v.issuedAt).toISOString(),
      expiresAt: new Date(v.expiresAt).toISOString(),
    };
  });

  // Name search is applied post-populate (the name lives on the joined User doc).
  const search = typeof q.search === 'string' ? q.search.trim().toLowerCase() : '';
  if (search) items = items.filter((i) => i.userName.toLowerCase().includes(search) || i.skillName.toLowerCase().includes(search));

  return paginate(items, search ? items.length : total, page, limit);
}

export async function revokeVerification(adminId: string, verificationId: string, reason: string): Promise<IAdminVerificationRow> {
  assertObjectId(verificationId, 'verificationId');
  const v = await Verification.findById(verificationId);
  if (!v) throw new AppError('Verification not found.', 404, true);
  if (v.status === 'REVOKED') throw new AppError('Verification is already revoked.', 409, true);

  v.status = 'REVOKED';
  v.flagReason = (reason ?? '').slice(0, 500) || 'Revoked by administrator.';
  await v.save();

  // Mirror the revocation onto the user's denormalized skill summary so it stops
  // surfacing in recruiter search, and flag the embedded skill entry.
  await User.updateOne(
    { _id: v.userId, 'skills.skillId': v.skillId },
    { $set: { 'skills.$.status': 'flagged' } },
  ).catch(() => { /* embedded entry may not exist */ });
  await User.updateOne(
    { _id: v.userId },
    { $pull: { verifiedSkillsSummary: { skillId: v.skillId } } },
  ).catch(() => { /* summary may not contain it */ });

  logger.info(`[admin] ${adminId} revoked verification ${verificationId} (${reason})`);
  return {
    _id: v._id.toString(), userId: v.userId.toString(), userName: '', skillName: '',
    tier: v.tier, compositeScore: v.compositeScore, aiProbability: v.aiProbability,
    status: v.status, flagReason: v.flagReason, certificateId: v.certificateId,
    sessionId: v.sessionId?.toString() ?? '',
    issuedAt: new Date(v.issuedAt).toISOString(),
    expiresAt: new Date(v.expiresAt).toISOString(),
  };
}

// ── Skill catalog management ─────────────────────────────────────────────────────

const SKILL_CATEGORIES = ['frontend', 'backend', 'database', 'devops', 'ai', 'design', 'other'];
const SKILL_TIERS = ['beginner', 'intermediate', 'advanced', 'expert'];

export interface IAdminSkillRow {
  _id: string; name: string; slug: string; category: string;
  availableTiers: string[]; description: string; icon: string;
  isActive: boolean; totalVerified: number; createdAt: string;
}

function skillRow(s: {
  _id: Types.ObjectId; name: string; slug: string; category: string;
  availableTiers: string[]; description: string; icon: string;
  isActive: boolean; totalVerified: number; createdAt: Date;
}): IAdminSkillRow {
  return {
    _id: s._id.toString(), name: s.name, slug: s.slug, category: s.category,
    availableTiers: s.availableTiers, description: s.description ?? '', icon: s.icon ?? '',
    isActive: s.isActive, totalVerified: s.totalVerified ?? 0,
    createdAt: new Date(s.createdAt).toISOString(),
  };
}

export async function listSkills(): Promise<IAdminSkillRow[]> {
  const skills = await Skill.find({}).sort({ name: 1 }).lean();
  return skills.map(skillRow);
}

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

interface SkillInput {
  name?: unknown; slug?: unknown; category?: unknown;
  availableTiers?: unknown; description?: unknown; icon?: unknown; isActive?: unknown;
}

export async function createSkill(adminId: string, input: SkillInput): Promise<IAdminSkillRow> {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) throw new AppError('Skill name is required.', 400, true);
  const category = typeof input.category === 'string' && SKILL_CATEGORIES.includes(input.category) ? input.category : 'other';
  const slug = (typeof input.slug === 'string' && input.slug.trim()) ? slugify(input.slug) : slugify(name);

  const tiers = Array.isArray(input.availableTiers)
    ? input.availableTiers.filter((t): t is string => typeof t === 'string' && SKILL_TIERS.includes(t))
    : ['beginner', 'intermediate', 'advanced'];

  const exists = await Skill.findOne({ $or: [{ slug }, { name }] }).lean();
  if (exists) throw new AppError('A skill with that name or slug already exists.', 409, true);

  const created = await Skill.create({
    name, slug, category,
    availableTiers: tiers.length ? tiers : ['beginner', 'intermediate', 'advanced'],
    description: typeof input.description === 'string' ? input.description.slice(0, 1000) : '',
    icon: typeof input.icon === 'string' ? input.icon.slice(0, 16) : '',
    isActive: input.isActive === undefined ? true : Boolean(input.isActive),
  });
  logger.info(`[admin] ${adminId} created skill ${created.slug}`);
  return skillRow(created);
}

export async function updateSkill(adminId: string, skillId: string, input: SkillInput): Promise<IAdminSkillRow> {
  assertObjectId(skillId, 'skillId');
  const skill = await Skill.findById(skillId);
  if (!skill) throw new AppError('Skill not found.', 404, true);

  if (typeof input.name === 'string' && input.name.trim()) skill.name = input.name.trim();
  if (typeof input.category === 'string' && SKILL_CATEGORIES.includes(input.category)) {
    skill.category = input.category as typeof skill.category;
  }
  if (typeof input.description === 'string') skill.description = input.description.slice(0, 1000);
  if (typeof input.icon === 'string') skill.icon = input.icon.slice(0, 16);
  if (input.isActive !== undefined) skill.isActive = Boolean(input.isActive);
  if (Array.isArray(input.availableTiers)) {
    const tiers = input.availableTiers.filter((t): t is string => typeof t === 'string' && SKILL_TIERS.includes(t));
    if (tiers.length) skill.availableTiers = tiers;
  }
  await skill.save();
  logger.info(`[admin] ${adminId} updated skill ${skill.slug}`);
  return skillRow(skill);
}

export async function toggleSkillActive(adminId: string, skillId: string): Promise<IAdminSkillRow> {
  assertObjectId(skillId, 'skillId');
  const skill = await Skill.findById(skillId);
  if (!skill) throw new AppError('Skill not found.', 404, true);
  skill.isActive = !skill.isActive;
  await skill.save();
  logger.info(`[admin] ${adminId} toggled skill ${skill.slug} -> active=${skill.isActive}`);
  return skillRow(skill);
}

// ── Content moderation: jobs & posts ─────────────────────────────────────────────

export interface IAdminJobRow {
  _id: string; title: string; companyName: string; recruiterName: string;
  employmentType: string; workType: string; location: string; status: string;
  postedAt: string; createdAt: string;
}

export async function listJobs(q: { page?: unknown; limit?: unknown; status?: unknown }): Promise<IPaginated<IAdminJobRow>> {
  const { page, limit, skip } = pageParams(q);
  const filter: Record<string, unknown> = {};
  if (q.status === 'active' || q.status === 'closed' || q.status === 'draft') filter.status = q.status;

  const [docs, total] = await Promise.all([
    Job.find(filter)
      .populate<{ companyId: { name: string } }>('companyId', 'name')
      .populate<{ recruiterId: { firstName: string; lastName: string } }>('recruiterId', 'firstName lastName')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Job.countDocuments(filter),
  ]);

  const items: IAdminJobRow[] = docs.map((j) => {
    const rec = j.recruiterId as { firstName?: string; lastName?: string } | null;
    return {
      _id: j._id.toString(), title: j.title,
      companyName: (j.companyId as { name?: string })?.name ?? '—',
      recruiterName: rec ? `${rec.firstName ?? ''} ${rec.lastName ?? ''}`.trim() : '—',
      employmentType: j.employmentType, workType: j.workType, location: j.location ?? '',
      status: j.status,
      postedAt: j.postedAt ? new Date(j.postedAt).toISOString() : new Date(j.createdAt).toISOString(),
      createdAt: new Date(j.createdAt).toISOString(),
    };
  });
  return paginate(items, total, page, limit);
}

export async function setJobStatus(adminId: string, jobId: string, status: string): Promise<IAdminJobRow> {
  assertObjectId(jobId, 'jobId');
  if (!['active', 'closed', 'draft'].includes(status)) throw new AppError('Invalid job status.', 400, true);
  const job = await Job.findByIdAndUpdate(jobId, { status }, { new: true })
    .populate<{ companyId: { name: string } }>('companyId', 'name')
    .populate<{ recruiterId: { firstName: string; lastName: string } }>('recruiterId', 'firstName lastName')
    .lean();
  if (!job) throw new AppError('Job not found.', 404, true);
  logger.info(`[admin] ${adminId} set job ${jobId} status=${status}`);
  const rec = job.recruiterId as { firstName?: string; lastName?: string } | null;
  return {
    _id: job._id.toString(), title: job.title,
    companyName: (job.companyId as { name?: string })?.name ?? '—',
    recruiterName: rec ? `${rec.firstName ?? ''} ${rec.lastName ?? ''}`.trim() : '—',
    employmentType: job.employmentType, workType: job.workType, location: job.location ?? '',
    status: job.status,
    postedAt: job.postedAt ? new Date(job.postedAt).toISOString() : new Date(job.createdAt).toISOString(),
    createdAt: new Date(job.createdAt).toISOString(),
  };
}

export interface IAdminPostRow {
  _id: string; authorName: string; type: string; content: string;
  likeCount: number; commentCount: number; isDeleted: boolean; createdAt: string;
}

export async function listPosts(q: { page?: unknown; limit?: unknown; includeDeleted?: unknown }): Promise<IPaginated<IAdminPostRow>> {
  const { page, limit, skip } = pageParams(q);
  const filter: Record<string, unknown> = {};
  if (q.includeDeleted !== 'true' && q.includeDeleted !== true) filter.isDeleted = { $ne: true };

  const [docs, total] = await Promise.all([
    Post.find(filter)
      .populate<{ authorId: { firstName: string; lastName: string } }>('authorId', 'firstName lastName')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Post.countDocuments(filter),
  ]);

  const items: IAdminPostRow[] = docs.map((p) => {
    const a = p.authorId as { firstName?: string; lastName?: string } | null;
    return {
      _id: p._id.toString(),
      authorName: a ? `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() : 'Deleted user',
      type: p.type,
      content: (p.content ?? '').slice(0, 280),
      likeCount: Array.isArray(p.likes) ? p.likes.length : 0,
      commentCount: Array.isArray(p.comments) ? p.comments.length : 0,
      isDeleted: Boolean(p.isDeleted),
      createdAt: new Date(p.createdAt).toISOString(),
    };
  });
  return paginate(items, total, page, limit);
}

export async function deletePost(adminId: string, postId: string): Promise<{ _id: string; isDeleted: boolean }> {
  assertObjectId(postId, 'postId');
  const post = await Post.findById(postId);
  if (!post) throw new AppError('Post not found.', 404, true);
  post.isDeleted = true;
  await post.save();
  logger.info(`[admin] ${adminId} soft-deleted post ${postId}`);
  return { _id: post._id.toString(), isDeleted: true };
}
