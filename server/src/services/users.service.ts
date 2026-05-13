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

/** Resolve the viewer's connection status with the target user */
async function resolveConnectionStatus(
  viewerId: string | undefined,
  targetId: string,
): Promise<{ status: 'accepted' | 'pending' | 'none'; connectionId?: string }> {
  if (!viewerId || viewerId === targetId) return { status: 'none' };

  const conn = await Connection.findOne({
    $or: [
      { requesterId: viewerId, recipientId: targetId },
      { requesterId: targetId, recipientId: viewerId },
    ],
  }).lean();

  if (!conn) return { status: 'none' };
  const connectionId = (conn._id as { toString(): string }).toString();
  if (conn.status === 'accepted') return { status: 'accepted', connectionId };
  if (conn.status === 'pending') {
    // Only expose connectionId when the viewer is the RECIPIENT so that
    // ConnectionButton shows Accept/Decline. When the viewer is the requester
    // (outgoing request) connectionId must be absent so the button shows
    // Pending/Withdraw instead.
    const isRecipient = (conn.recipientId as { toString(): string }).toString() === viewerId;
    return { status: 'pending', ...(isRecipient ? { connectionId } : {}) };
  }
  return { status: 'none' };
}

/** Map a Mongoose user doc → IUserPublic (safe for API) */
async function toPublicUser(
  doc: IUserDocument,
  viewerId?: string,
): Promise<IUserPublic> {
  const { status: connStatus, connectionId: connId } = await resolveConnectionStatus(viewerId, doc._id.toString());

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
    user.customUrl = generateCustomUrl(user.firstName, user.lastName);
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

  // 30-day protection on verified skills
  if (entry.status === 'verified' && entry.verificationId) {
    const verification = await Verification.findById(entry.verificationId).lean();
    if (verification) {
      const ageMs = Date.now() - new Date(verification.issuedAt).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays < 30) {
        throw new AppError(
          `Verified skills cannot be removed within 30 days of verification. ${Math.ceil(30 - ageDays)} days remaining.`,
          409,
          true,
        );
      }
    }
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

  const candidates: ICandidateCard[] = docs.map((doc) => {
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

    // Naive match score: # of verified skills * 20, capped at 100
    const matchScore = Math.min(100, verifiedSkills.length * 20);

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
  });

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