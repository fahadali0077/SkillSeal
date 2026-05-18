// ─────────────────────────────────────────────────────────────────────────────
// users.service.ts
// All user / profile business logic for the SkillSeal platform.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { type FilterQuery } from 'mongoose';
import { randomBytes } from 'crypto';
import type {
  IUserPublic,
  IUserPrivate,
  IExperience,
  IEducation,
  ILink,
  ICandidateCard,
  IVerifiedSkillBadge,
} from '@SkillSeal/shared';
import { ApiErrorCode } from '@SkillSeal/shared';
import { User } from '../models/User.model';
import type { IUserDocument } from '../models/User.model';
import { Skill } from '../models/Skill.model';
import { Connection } from '../models/Connection.model';
import { Verification } from '../models/Verification.model';
import { Job } from '../models/Job.model';
import type { IJobDocument } from '../models/Job.model';
import { computeMatchScore } from './jobs.service';
import { AppError } from '../middleware/error.middleware';
import { uploadBuffer } from '../config/cloudinary';
import logger from '../utils/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a custom URL slug: firstname-lastname-4hexchars */
function generateCustomUrl(firstName: string, lastName: string): string {
  const hex = randomBytes(2).toString('hex'); // 4 chars
  const base = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
  return `${base}-${hex}`;
}

/**
 * SEC-03: ensure the auto-generated customUrl is unique. The base form
 * `firstname-lastname-4hex` collides ~1 in 65k for the same name; this helper
 * appends a numeric suffix (-2, -3, …) until a free slot is found, capped at
 * 100 attempts so a poisoned namespace can't loop forever.
 */
async function generateUniqueCustomUrl(firstName: string, lastName: string, excludeUserId?: string): Promise<string> {
  let candidate = generateCustomUrl(firstName, lastName);
  for (let i = 2; i <= 100; i += 1) {
    const filter: Record<string, unknown> = { customUrl: candidate };
    if (excludeUserId) filter._id = { $ne: excludeUserId };
    const taken = await User.findOne(filter).select('_id').lean();
    if (!taken) return candidate;
    candidate = `${generateCustomUrl(firstName, lastName).replace(/-[0-9a-f]{4}$/, '')}-${i}`;
  }
  // Fallback: timestamp suffix is guaranteed unique.
  return `${firstName}-${lastName}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

/** Resolve the viewer's connection status with the target user */
async function resolveConnectionStatus(
  viewerId: string | undefined,
  targetId: string,
): Promise<{ status: 'accepted' | 'pending' | 'none'; connectionId?: string; isFollowing: boolean }> {
  if (!viewerId || viewerId === targetId) return { status: 'none', isFollowing: false };

  const [conn, viewer] = await Promise.all([
    Connection.findOne({
      $or: [
        { requesterId: viewerId, recipientId: targetId },
        { requesterId: targetId, recipientId: viewerId },
      ],
    }).lean(),
    User.findById(viewerId).select('following').lean<IUserDocument>(),
  ]);

  const isFollowing = viewer?.following?.some(
    (id) => id.toString() === targetId,
  ) ?? false;

  if (!conn) return { status: 'none', isFollowing };
  const connectionId = (conn._id as { toString(): string }).toString();
  if (conn.status === 'accepted') return { status: 'accepted', connectionId, isFollowing };
  if (conn.status === 'pending') {
    // Only expose connectionId when the viewer is the RECIPIENT so that
    // ConnectionButton shows Accept/Decline. When the viewer is the requester
    // (outgoing request) connectionId must be absent so the button shows
    // Pending/Withdraw instead.
    const isRecipient = (conn.recipientId as { toString(): string }).toString() === viewerId;
    return { status: 'pending', ...(isRecipient ? { connectionId } : {}), isFollowing };
  }
  return { status: 'none', isFollowing };
}

/** Map a Mongoose user doc → IUserPublic (safe for API) */
async function toPublicUser(
  doc: IUserDocument,
  viewerId?: string,
): Promise<IUserPublic> {
  const resolvedConn = await resolveConnectionStatus(viewerId, doc._id.toString());
  const { status: connStatus, connectionId: connId, isFollowing: connIsFollowing } = resolvedConn;

  return {
    _id: doc._id.toString(),
    firstName: doc.firstName,
    lastName: doc.lastName,
    fullName: `${doc.firstName} ${doc.lastName}`,
    headline: doc.headline ?? '',
    summary: doc.summary ?? '',
    location: { city: doc.location?.city ?? '', country: doc.location?.country ?? '' },
    profilePhoto: doc.profilePhoto ?? '',
    bannerImage: doc.bannerImage ?? '',
    customUrl: doc.customUrl ?? '',
    role: doc.role,
    accountType: doc.accountType,
    openToWork: doc.openToWork,
    isHiring: doc.isHiring,
    skills: doc.skills.map((s) => ({
      skillId: s.skillId.toString(),
      skillName: '',     // populated by getProfile
      skillSlug: '',
      status: s.status,
      verificationId: s.verificationId?.toString() ?? null,
      addedAt: s.addedAt.toISOString(),
    })),
    experience: doc.experience.map((e) => {
      const exp = e as typeof e & { _id?: { toString(): string } };
      return {
        _id: exp._id?.toString() ?? '',
        title: e.title,
        company: e.company,
        companyId: e.companyId?.toString() ?? null,
        employmentType: e.employmentType as IExperience['employmentType'],
        startDate: e.startDate,
        endDate: { ...e.endDate, isCurrent: e.endDate?.isCurrent ?? false },
        location: e.location ?? '',
        description: e.description ?? '',
        skillsUsed: (e.skillsUsed ?? []).map((id) => id.toString()),
      };
    }),
    education: doc.education.map((ed) => {
      const edu = ed as typeof ed & { _id?: { toString(): string } };
      return {
        _id: edu._id?.toString() ?? '',
        institution: ed.institution,
        degree: ed.degree,
        field: ed.field,
        startYear: ed.startYear,
        endYear: ed.endYear ?? null,
        inProgress: ed.inProgress ?? false,
        grade: ed.grade ?? '',
        description: ed.description ?? '',
      };
    }),
    links: doc.links.map((l) => ({
      label: l.label ?? '',
      url: l.url ?? '',
      type: l.type as ILink['type'],
    })),
    connectionCount: doc.connectionCount ?? doc.connections?.length ?? 0,
    followerCount: doc.followerCount ?? doc.followers?.length ?? 0,
    followingCount: doc.followingCount ?? doc.following?.length ?? 0,
    connectionStatus: connStatus,
    connectionId: connId,
    isFollowing: connIsFollowing,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 · GET profile
// ─────────────────────────────────────────────────────────────────────────────

export async function getProfile(
  targetId: string,
  viewerId?: string,
): Promise<IUserPublic> {
  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    throw new AppError('Invalid user ID.', 400, true);
  }

  const doc = await User.findById(targetId).lean<IUserDocument>();
  if (!doc) throw new AppError('User not found.', 404, true);

  // Populate skill names from Skill collection
  const skillIds = doc.skills.map((s) => s.skillId);
  const skillDocs = await Skill.find({ _id: { $in: skillIds } }).lean();
  const skillMap = new Map(skillDocs.map((s) => [s._id.toString(), s]));

  const result = await toPublicUser(doc as unknown as IUserDocument, viewerId);

  // Enrich skills with name/slug
  result.skills = result.skills.map((s) => {
    const sk = skillMap.get(s.skillId);
    return { ...s, skillName: sk?.name ?? '', skillSlug: sk?.slug ?? '' };
  });

  // Determine visibility level
  const isSelf = viewerId === targetId;
  const isFirst = result.connectionStatus === 'accepted';

  if (!isSelf && !isFirst) {
    // Non-connected viewer: hide email-related, sensitive links
    result.links = result.links.filter((l) => l.type !== 'other');
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · PUT profile basics
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateProfileInput {
  headline?: string;
  summary?: string;
  location?: { city?: string; country?: string };
  openToWork?: boolean;
  isHiring?: boolean;
  links?: ILink[];
  customUrl?: string;
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<IUserPublic> {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404, true);

  // Auto-generate customUrl on first profile update if not set
  if (!user.customUrl) {
    // SEC-03: ensure the generated slug is unique before saving.
    user.customUrl = await generateUniqueCustomUrl(user.firstName, user.lastName, userId);
  }

  // Validate / set customUrl if provided
  if (input.customUrl && input.customUrl !== user.customUrl) {
    const taken = await User.findOne({ customUrl: input.customUrl, _id: { $ne: userId } });
    if (taken) throw new AppError('This custom URL is already taken.', 409, true);
    user.customUrl = input.customUrl.toLowerCase().replace(/[^a-z0-9-]/g, '');
  }

  if (input.headline !== undefined) user.headline = input.headline.slice(0, 220);
  if (input.summary !== undefined) user.summary = input.summary.slice(0, 2600);
  if (input.location !== undefined) user.location = input.location;
  if (input.openToWork !== undefined) user.openToWork = input.openToWork;
  if (input.isHiring !== undefined) user.isHiring = input.isHiring;
  if (input.links !== undefined) user.links = input.links as IUserDocument['links'];

  await user.save();
  return toPublicUser(user, userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3-5 · Experience CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function addExperience(
  userId: string,
  entry: Omit<IExperience, '_id'>,
): Promise<IUserPublic> {
  if (!entry.title || !entry.company) {
    throw new AppError('Title and company are required.', 400, true);
  }
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404, true);

  user.experience.push(entry as unknown as IUserDocument['experience'][number]);
  await user.save();
  return toPublicUser(user, userId);
}

export async function updateExperience(
  userId: string,
  expId: string,
  patch: Partial<Omit<IExperience, '_id'>>,
): Promise<IUserPublic> {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404, true);

  const exp = user.experience.find((e) => (e as typeof e & { _id?: { toString(): string } })._id?.toString() === expId);
  if (!exp) throw new AppError('Experience entry not found.', 404, true);

  Object.assign(exp, patch);
  await user.save();
  return toPublicUser(user, userId);
}

export async function deleteExperience(
  userId: string,
  expId: string,
): Promise<IUserPublic> {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404, true);

  const idx = user.experience.findIndex((e) => (e as typeof e & { _id?: { toString(): string } })._id?.toString() === expId);
  if (idx === -1) throw new AppError('Experience entry not found.', 404, true);

  user.experience.splice(idx, 1);
  await user.save();
  return toPublicUser(user, userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6 · Education CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function addEducation(
  userId: string,
  entry: Omit<IEducation, '_id'>,
): Promise<IUserPublic> {
  if (!entry.institution || !entry.degree) {
    throw new AppError('Institution and degree are required.', 400, true);
  }
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404, true);

  user.education.push(entry as IUserDocument['education'][number]);
  await user.save();
  return toPublicUser(user, userId);
}

export async function updateEducation(
  userId: string,
  eduId: string,
  patch: Partial<Omit<IEducation, '_id'>>,
): Promise<IUserPublic> {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404, true);

  const edu = user.education.find((e) => (e as typeof e & { _id?: { toString(): string } })._id?.toString() === eduId);
  if (!edu) throw new AppError('Education entry not found.', 404, true);

  Object.assign(edu, patch);
  await user.save();
  return toPublicUser(user, userId);
}

export async function deleteEducation(
  userId: string,
  eduId: string,
): Promise<IUserPublic> {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404, true);

  const idx = user.education.findIndex((e) => (e as typeof e & { _id?: { toString(): string } })._id?.toString() === eduId);
  if (idx === -1) throw new AppError('Education entry not found.', 404, true);

  user.education.splice(idx, 1);
  await user.save();
  return toPublicUser(user, userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7 · Add skill
// ─────────────────────────────────────────────────────────────────────────────

export async function addSkill(userId: string, skillId: string): Promise<IUserPublic> {
  if (!mongoose.Types.ObjectId.isValid(skillId)) {
    throw new AppError('Invalid skill ID.', 400, true);
  }

  const skillDoc = await Skill.findById(skillId);
  if (!skillDoc || !skillDoc.isActive) {
    throw new AppError('Skill not found.', 404, true);
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404, true);

  const already = user.skills.some((s) => s.skillId.toString() === skillId);
  if (already) throw new AppError('This skill is already on your profile.', 409, true);

  user.skills.push({
    skillId: new mongoose.Types.ObjectId(skillId),
    status: 'unverified',
    verificationId: null,
    addedAt: new Date(),
  });
  await user.save();
  logger.info(`[users] Skill added: userId=${userId} skillId=${skillId}`);
  return toPublicUser(user, userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8 · Remove skill
// ─────────────────────────────────────────────────────────────────────────────

export async function removeSkill(userId: string, skillId: string): Promise<IUserPublic> {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404, true);

  const idx = user.skills.findIndex((s) => s.skillId.toString() === skillId);
  if (idx === -1) throw new AppError('Skill not found on profile.', 404, true);

  const entry = user.skills[idx];

  // 30-day protection on verified or flagged skills.
  // CRIT-07: a flagged skill must not be deletable instantly — that would
  // erase AI-detection evidence and let the user re-test as if clean.
  if ((entry.status === 'verified' || entry.status === 'flagged') && entry.verificationId) {
    const verification = await Verification.findById(entry.verificationId).lean();
    if (verification) {
      const ageMs = Date.now() - new Date(verification.issuedAt).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays < 30) {
        throw new AppError(
          `Verified or flagged skills cannot be removed within 30 days of verification. ${Math.ceil(30 - ageDays)} days remaining.`,
          409,
          true,
        );
      }
    }
  }

  // BROKEN-12: also mark the associated Verification document as WITHDRAWN
  // so recruiter audits can see the candidate intentionally retired the
  // credential. Pull from verifiedSkillsSummary too so recruiter search and
  // profile cards stop showing it immediately.
  if (entry.verificationId) {
    await Verification.findByIdAndUpdate(entry.verificationId, { status: 'WITHDRAWN' });
    await User.updateOne(
      { _id: userId },
      { $pull: { verifiedSkillsSummary: { skillId: entry.skillId } } },
    );
  }

  user.skills.splice(idx, 1);
  await user.save();
  return toPublicUser(user, userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9 · Profile photo upload
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadProfilePhoto(
  userId: string,
  buffer: Buffer,
  mimetype: string,
): Promise<{ photoUrl: string }> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(mimetype)) {
    throw new AppError('Only JPEG, PNG, and WebP images are allowed.', 400, true);
  }

  const { url } = await uploadBuffer(buffer, 'SkillSeal/avatars', `avatar_${userId}`);

  await User.findByIdAndUpdate(userId, { profilePhoto: url });
  logger.info(`[users] Profile photo updated: userId=${userId}`);
  return { photoUrl: url };
}

/**
 * HIGH-13: upload a banner image. Mirrors uploadProfilePhoto exactly so
 * validation, storage path, and audit logging stay consistent.
 */
export async function uploadBannerImage(
  userId: string,
  buffer: Buffer,
  mimetype: string,
): Promise<{ bannerUrl: string }> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(mimetype)) {
    throw new AppError('Only JPEG, PNG, and WebP images are allowed.', 400, true);
  }
  const { url } = await uploadBuffer(buffer, 'SkillSeal/banners', `banner_${userId}`);
  await User.findByIdAndUpdate(userId, { bannerImage: url });
  logger.info(`[users] Banner image updated: userId=${userId}`);
  return { bannerUrl: url };
}

// ─────────────────────────────────────────────────────────────────────────────
// 10 · Search / candidate discovery
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchQuery {
  skill?: string;
  tier?: string;
  verifiedOnly?: boolean;
  location?: string;
  openToWork?: boolean;
  page?: number;
  limit?: number;
  /** HIGH-06: when provided, candidates are scored against this real job. */
  jobId?: string;
}

export async function searchUsers(query: SearchQuery): Promise<{
  candidates: ICandidateCard[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, query.limit ?? 20);
  const skip = (page - 1) * limit;

  const filter: FilterQuery<IUserDocument> = {
    emailVerified: true,
    'skills.0': { $exists: true },
  };

  if (query.openToWork) filter.openToWork = true;

  if (query.location) {
    filter.$or = [
      { 'location.city': { $regex: query.location, $options: 'i' } },
      { 'location.country': { $regex: query.location, $options: 'i' } },
    ];
  }

  if (query.skill) {
    const skillDoc = await Skill.findOne({
      $or: [{ slug: query.skill }, { _id: mongoose.Types.ObjectId.isValid(query.skill) ? query.skill : null }],
    }).lean();

    if (skillDoc) {
      const skillFilter: FilterQuery<IUserDocument['skills'][number]> = {
        skillId: skillDoc._id,
      };
      if (query.verifiedOnly) skillFilter.status = 'verified';
      filter.skills = { $elemMatch: skillFilter };
    }
  }

  const [docs, total] = await Promise.all([
    User.find(filter).skip(skip).limit(limit).lean<IUserDocument[]>(),
    User.countDocuments(filter),
  ]);

  // HIGH-06: if a real job context is provided, compute a proper match score
  // against that job using jobs.service.computeMatchScore(). Otherwise the
  // caller gets 0 — the naive "verifiedSkills.length * 20" heuristic was
  // misleading because it implied a match against nothing.
  let jobDoc: IJobDocument | null = null;
  if (query.jobId && mongoose.Types.ObjectId.isValid(query.jobId)) {
    jobDoc = await Job.findById(query.jobId).lean<IJobDocument>();
  }

  // Enrich with verified skill badges
  const allSkillIds = [...new Set(docs.flatMap((d) => d.skills.map((s) => s.skillId.toString())))];
  const allSkills = await Skill.find({ _id: { $in: allSkillIds } }).lean();
  const skillMap = new Map(allSkills.map((s) => [s._id.toString(), s]));

  const allVerifIds = [
    ...new Set(
      docs.flatMap((d) =>
        d.skills
          .filter((s) => s.status === 'verified' && s.verificationId)
          .map((s) => s.verificationId!.toString()),
      ),
    ),
  ];
  const verifDocs = await Verification.find({ _id: { $in: allVerifIds } }).lean();
  const verifMap = new Map(verifDocs.map((v) => [v._id.toString(), v]));

  const candidates: ICandidateCard[] = await Promise.all(docs.map(async (doc) => {
    const verifiedSkills: IVerifiedSkillBadge[] = doc.skills
      .filter((s) => s.status === 'verified' && s.verificationId)
      .map((s) => {
        const sk = skillMap.get(s.skillId.toString());
        const vr = verifMap.get(s.verificationId!.toString());
        return {
          skillId: s.skillId.toString(),
          skillName: sk?.name ?? '',
          skillSlug: sk?.slug ?? '',
          tier: vr?.tier ?? 'beginner',
          compositeScore: vr?.compositeScore ?? 0,
          status: vr?.status ?? 'VERIFIED',
          issuedAt: vr?.issuedAt?.toISOString() ?? '',
          expiresAt: vr?.expiresAt?.toISOString() ?? '',
        } as IVerifiedSkillBadge;
      });

    const latestExp = doc.experience?.[0] ?? null;
    const latestEdu = doc.education?.[0] ?? null;

    // HIGH-06: use the real job-match algorithm when a job context is passed.
    // No job context → matchScore is 0 (the previous heuristic implied a match
    // against nothing, which was misleading to recruiters).
    const matchScore = jobDoc ? await computeMatchScore(jobDoc, doc) : 0;

    return {
      userId: doc._id.toString(),
      fullName: `${doc.firstName} ${doc.lastName}`,
      firstName: doc.firstName,
      lastName: doc.lastName,
      headline: doc.headline ?? '',
      profilePhoto: doc.profilePhoto ?? '',
      customUrl: doc.customUrl ?? '',
      location: { city: doc.location?.city ?? '', country: doc.location?.country ?? '' },
      accountType: doc.accountType,
      openToWork: doc.openToWork,
      verifiedSkills,
      topSkillNames: verifiedSkills.slice(0, 5).map((s) => s.skillName),
      connectionCount: doc.connectionCount ?? doc.connections?.length ?? 0,
      currentRole: latestExp ? { title: latestExp.title, company: latestExp.company } : null,
      education: latestEdu ? { institution: latestEdu.institution, degree: latestEdu.degree, field: latestEdu.field } : null,
      matchScore,
      hasApplied: false,
      isSaved: false,
    };
  }));

  return { candidates, total, page, totalPages: Math.ceil(total / limit) };
}

// ─────────────────────────────────────────────────────────────────────────────
// 11 · Profile completeness score
// ─────────────────────────────────────────────────────────────────────────────

export interface CompletenessResult {
  score: number;
  sections: Record<string, { earned: number; max: number; label: string }>;
}

export async function getCompleteness(userId: string): Promise<CompletenessResult> {
  const user = await User.findById(userId).lean<IUserDocument>();
  if (!user) throw new AppError('User not found.', 404, true);

  const verifiedCount = user.skills.filter((s) => s.status === 'verified').length;
  const hasPortfolio = user.links.some((l) => ['portfolio', 'github'].includes(l.type));
  const connCount = user.connections?.length ?? 0;

  const sections: CompletenessResult['sections'] = {
    photo: { max: 10, earned: user.profilePhoto ? 10 : 0, label: 'Profile photo' },
    headline: { max: 10, earned: user.headline?.length ? 10 : 0, label: 'Headline' },
    summary: { max: 10, earned: (user.summary?.length ?? 0) >= 100 ? 10 : 0, label: 'Summary (100+ chars)' },
    experience: { max: 15, earned: user.experience?.length ? 15 : 0, label: 'Work experience' },
    education: { max: 10, earned: user.education?.length ? 10 : 0, label: 'Education' },
    skill1: { max: 20, earned: verifiedCount >= 1 ? 20 : 0, label: 'First verified skill' },
    skill3: { max: 10, earned: verifiedCount >= 3 ? 10 : 0, label: '3 verified skills' },
    portfolio: { max: 5, earned: hasPortfolio ? 5 : 0, label: 'Portfolio / GitHub link' },
    connections5: { max: 10, earned: connCount >= 5 ? 10 : 0, label: '5+ connections' },
  };

  const score = Object.values(sections).reduce((acc, s) => acc + s.earned, 0);
  return { score, sections };
}

// ─────────────────────────────────────────────────────────────────────────────
// People search — general "find users by name / headline / skill" search used
// by the Network page. Separate from searchUsers() above which is recruiter-
// oriented (returns ICandidateCard with match scoring). This one returns a
// lightweight UserMini-style shape with the viewer's connectionStatus included
// so the ConnectionButton component can render the right state inline.
// ─────────────────────────────────────────────────────────────────────────────

export interface PeopleSearchResult {
  userId:          string;
  fullName:        string;
  firstName:       string;
  lastName:        string;
  headline:        string;
  profilePhoto:    string;
  customUrl:       string;
  connectionCount: number;
  mutualCount:     number;
  connectionStatus: 'none' | 'pending' | 'accepted';
  connectionId?:   string;        // only set when viewer is RECIPIENT of pending
  matchedOn:       'name' | 'headline' | 'skill';
}

/** Escape regex metacharacters in a user-supplied search string. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function searchPeople(
  viewerId: string,
  q: string,
  page = 1,
  limit = 20,
): Promise<{ results: PeopleSearchResult[]; total: number; page: number; totalPages: number }> {
  const trimmed = q.trim();
  if (trimmed.length < 2) {
    return { results: [], total: 0, page: 1, totalPages: 0 };
  }

  const safeLimit = Math.min(50, Math.max(1, limit));
  const safePage  = Math.max(1, page);
  const skip      = (safePage - 1) * safeLimit;
  const pattern   = escapeRegex(trimmed);
  const rx        = { $regex: pattern, $options: 'i' };

  // ── 1. Find skill IDs whose name matches the keyword ────────────────────
  const matchingSkills = await Skill.find({ name: rx }).select('_id').lean();
  const matchingSkillIds = matchingSkills.map((s) => s._id);

  // ── 2. Build the main filter ────────────────────────────────────────────
  const orClauses: FilterQuery<IUserDocument>[] = [
    { firstName: rx },
    { lastName: rx },
    { headline: rx },
  ];
  if (matchingSkillIds.length > 0) {
    orClauses.push({ 'skills.skillId': { $in: matchingSkillIds } });
  }

  const filter: FilterQuery<IUserDocument> = {
    emailVerified: true,
    _id: { $ne: new mongoose.Types.ObjectId(viewerId) },
    $or: orClauses,
  };

  // ── 3. Run search + count + load viewer (for mutualCount) in parallel ───
  const [docs, total, viewer] = await Promise.all([
    User.find(filter)
      .select('firstName lastName headline profilePhoto customUrl connections skills')
      .sort({ 'connections.length': -1, _id: 1 }) // popular first as a proxy for relevance
      .skip(skip)
      .limit(safeLimit)
      .lean<IUserDocument[]>(),
    User.countDocuments(filter),
    User.findById(viewerId).select('connections').lean<IUserDocument>(),
  ]);

  if (docs.length === 0) {
    return { results: [], total, page: safePage, totalPages: Math.ceil(total / safeLimit) };
  }

  // ── 4. Batch-resolve connection statuses (1 query for all results) ──────
  const resultIds = docs.map((d) => d._id);
  const conns = await Connection.find({
    $or: [
      { requesterId: viewerId, recipientId: { $in: resultIds } },
      { recipientId: viewerId, requesterId: { $in: resultIds } },
    ],
  }).lean();

  // Map otherUserId → connection record
  const connByUser = new Map<string, { _id: mongoose.Types.ObjectId; status: string; recipientId: mongoose.Types.ObjectId }>();
  for (const c of conns) {
    const other = c.requesterId.toString() === viewerId
      ? c.recipientId.toString()
      : c.requesterId.toString();
    connByUser.set(other, c as never);
  }

  // ── 5. Mutual connections (intersect viewer.connections with each result) ─
  const viewerConnSet = new Set(
    (viewer?.connections ?? []).map((id) => id.toString()),
  );

  // ── 6. Shape the results ────────────────────────────────────────────────
  const matchedSkillIdSet = new Set(matchingSkillIds.map((id) => id.toString()));
  const lowerQ = trimmed.toLowerCase();

  const results: PeopleSearchResult[] = docs.map((doc) => {
    const uid = doc._id.toString();

    // Connection status
    let connectionStatus: 'none' | 'pending' | 'accepted' = 'none';
    let connectionId: string | undefined;
    const conn = connByUser.get(uid);
    if (conn) {
      if (conn.status === 'accepted') {
        connectionStatus = 'accepted';
        connectionId = conn._id.toString();
      } else if (conn.status === 'pending') {
        connectionStatus = 'pending';
        // only expose id when viewer is the recipient (same rule as profile fetch)
        if (conn.recipientId.toString() === viewerId) {
          connectionId = conn._id.toString();
        }
      }
      // declined/withdrawn → treated as 'none'
    }

    // Mutual count
    const theirConns = (doc.connections ?? []).map((id) => id.toString());
    let mutualCount = 0;
    for (const id of theirConns) {
      if (viewerConnSet.has(id)) mutualCount++;
    }

    // What matched? (for "Matched on X" hints in the UI)
    let matchedOn: 'name' | 'headline' | 'skill' = 'name';
    const nameMatches =
      doc.firstName.toLowerCase().includes(lowerQ) ||
      doc.lastName.toLowerCase().includes(lowerQ);
    if (nameMatches) {
      matchedOn = 'name';
    } else if (doc.headline?.toLowerCase().includes(lowerQ)) {
      matchedOn = 'headline';
    } else if ((doc.skills ?? []).some((s) => matchedSkillIdSet.has(s.skillId.toString()))) {
      matchedOn = 'skill';
    }

    return {
      userId:          uid,
      fullName:        `${doc.firstName} ${doc.lastName}`,
      firstName:       doc.firstName,
      lastName:        doc.lastName,
      headline:        doc.headline ?? '',
      profilePhoto:    doc.profilePhoto ?? '',
      customUrl:       doc.customUrl ?? '',
      connectionCount: doc.connections?.length ?? 0,
      mutualCount,
      connectionStatus,
      ...(connectionId ? { connectionId } : {}),
      matchedOn,
    };
  });

  return {
    results,
    total,
    page: safePage,
    totalPages: Math.ceil(total / safeLimit),
  };
}