import { Types, type FilterQuery } from 'mongoose';
import { User } from '../models/User.model';
import type { IUserDocument } from '../models/User.model';
import { Verification } from '../models/Verification.model';
import type { IVerificationDocument } from '../models/Verification.model';
import { Session } from '../models/Session.model';
import type { ISessionDocument } from '../models/Session.model';
import { Answer } from '../models/Answer.model';
import type { IAnswerDocument } from '../models/Answer.model';
import { Event } from '../models/Event.model';
import type { IEventDocument } from '../models/Event.model';
import { Application } from '../models/Application.model';
import { Job } from '../models/Job.model';
import type { IJobDocument } from '../models/Job.model';
import { getConnectionDegree } from './connections.service';
import { Skill } from '../models/Skill.model';
import type { ISkillDocument } from '../models/Skill.model';
import { AppError } from '../middleware/error.middleware';
import type { SkillTier } from '@SkillSeal/shared';
export type IntegrityLevel = 'green' | 'yellow' | 'red';
function integrity(b: number): IntegrityLevel { return b >= 85 ? 'green' : b >= 70 ? 'yellow' : 'red'; }
export async function searchCandidates(recruiterId: string, params: Record<string, unknown>) {
  const { skill, tier, verifiedOnly, location, openToWork, sort = 'score', page = 1, limit = 20 } = params;
  const userFilter: FilterQuery<IUserDocument> = { _id: { $ne: new Types.ObjectId(recruiterId) }, emailVerified: true };
  if (openToWork) userFilter['openToWork'] = true;
  if (location) userFilter['$or'] = [{ 'location.city': { $regex: location, $options: 'i' } }, { 'location.country': { $regex: location, $options: 'i' } }];
  if (skill || tier || verifiedOnly) {
    const sk = skill ? await Skill.findOne({ $or: [{ slug: skill }, { name: { $regex: skill, $options: 'i' } }] }).lean<ISkillDocument>() : null;
    const vf: FilterQuery<IVerificationDocument> = { status: { $in: ['VERIFIED', 'FLAGGED'] } };
    if (sk) vf['skillId'] = sk._id; if (tier) vf['tier'] = tier;
    const vs = await Verification.find(vf).select('userId').lean<Pick<IVerificationDocument, '_id' | 'userId'>[]>();
    const ids = [...new Set(vs.map(v => v.userId.toString()))];
    if (!ids.length) return { candidates: [], total: 0 };
    userFilter['_id'] = { $in: ids.map(id => new Types.ObjectId(id)) };
  }
  const skip = ((page as number) - 1) * (limit as number);
  const [users, total] = await Promise.all([User.find(userFilter).sort(sort === 'active' ? { updatedAt: -1 } : { createdAt: -1 }).skip(skip).limit(limit as number).lean<IUserDocument[]>(), User.countDocuments(userFilter)]);
  const uids = users.map(u => u._id);
  const verifs = await Verification.find({ userId: { $in: uids }, status: { $in: ['VERIFIED', 'FLAGGED'] } }).sort({ compositeScore: -1 }).lean<IVerificationDocument[]>();
  const skids = [...new Set(verifs.map(v => v.skillId.toString()))];
  const sks = await Skill.find({ _id: { $in: skids } }).lean<ISkillDocument[]>();
  const skMap = new Map(sks.map(s => [s._id.toString(), s]));
  const vByUser = new Map<string, IVerificationDocument[]>();
  for (const v of verifs) { const uid = v.userId.toString(); if (!vByUser.has(uid)) vByUser.set(uid, []); vByUser.get(uid)!.push(v); }
  // PARTIAL-04: compute the real network distance from the recruiter to each
  // candidate so the UI can show the LinkedIn-style 1st/2nd/3rd degree badge.
  // Done in parallel after the main query so we don't fan out per row inside
  // the map. Falls back to 'none' if the lookup throws.
  const degreeEntries = await Promise.all(
    users.map(async (u) => {
      try {
        const d = await getConnectionDegree(recruiterId, u._id.toString());
        return [u._id.toString(), d] as const;
      } catch { return [u._id.toString(), 'none' as const] as const; }
    }),
  );
  const degreeMap = new Map(degreeEntries);

  const candidates = users.map(u => {
    const uid = u._id.toString(); const uv = vByUser.get(uid) ?? [];
    const aiMax = Math.max(...uv.map(v => v.aiProbability ?? 0), 0);
    return {
      userId: uid, firstName: u.firstName, lastName: u.lastName, fullName: `${u.firstName} ${u.lastName}`, headline: u.headline ?? '', location: u.location ?? {}, profilePhoto: u.profilePhoto ?? '', customUrl: u.customUrl ?? '', openToWork: u.openToWork ?? false,
      verifiedSkills: uv.slice(0, 3).map(v => ({ skillId: v.skillId.toString(), skillName: skMap.get(v.skillId.toString())?.name ?? '', skillSlug: skMap.get(v.skillId.toString())?.slug ?? '', tier: v.tier as SkillTier, compositeScore: v.compositeScore, issuedAt: v.issuedAt.toISOString(), status: v.status })),
      behaviorIntegrity: integrity(uv[0]?.behaviorScore ?? 100), aiFlag: aiMax > 0.40, connectionDegree: degreeMap.get(uid) ?? ('none' as const),
    };
  });
  return { candidates, total };
}
export async function getCandidateView(candidateId: string, recruiterId: string) {
  const user = await User.findById(candidateId).lean<IUserDocument>();
  if (!user) throw new AppError('Candidate not found.', 404, true);
  const verifs = await Verification.find({ userId: candidateId }).sort({ issuedAt: -1 }).lean<IVerificationDocument[]>();
  const sks = await Skill.find({ _id: { $in: verifs.map(v => v.skillId) } }).lean<ISkillDocument[]>();
  const skMap = new Map(sks.map(s => [s._id.toString(), s]));
  const app = await Application.findOne({ candidateId: new Types.ObjectId(candidateId), recruiterId: new Types.ObjectId(recruiterId) }).lean();
  return {
    profile: { _id: user._id.toString(), firstName: user.firstName, lastName: user.lastName, headline: user.headline ?? '', location: user.location ?? {}, profilePhoto: user.profilePhoto ?? '', customUrl: user.customUrl ?? '', openToWork: user.openToWork ?? false, experience: user.experience ?? [], education: user.education ?? [], skills: user.skills ?? [] },
    verifications: verifs.map(v => ({ _id: v._id.toString(), skillName: skMap.get(v.skillId.toString())?.name ?? '', tier: v.tier, compositeScore: v.compositeScore, conceptScore: v.conceptScore, speedScore: v.speedScore, consistencyScore: v.consistencyScore, behaviorScore: v.behaviorScore, aiScore: v.aiScore, aiProbability: v.aiProbability, sessionId: v.sessionId.toString(), certificateId: v.certificateId, issuedAt: v.issuedAt.toISOString(), expiresAt: v.expiresAt.toISOString(), status: v.status, flagReason: v.flagReason ?? '' })),
    pipelineEntry: app ? { _id: app._id.toString(), candidateId, jobId: app.jobId?.toString() ?? null, status: app.status, note: app.recruiterNote ?? '', recruiterId, createdAt: app.createdAt.toISOString(), updatedAt: app.updatedAt.toISOString() } : null,
  };
}
export async function getSessionAudit(sessionId: string, recruiterId: string) {
  const session = await Session.findById(sessionId).lean<ISessionDocument>();
  if (!session) throw new AppError('Session not found.', 404, true);
  // HIGH-05: access control queries here intentionally use candidateId +
  // recruiterId only, both of which are reliably populated on every
  // Application document. We deliberately do NOT filter by companyId — see
  // CRIT-04: historical Application docs were saved with a zero-ObjectId
  // companyId and would be filtered out incorrectly. Re-add companyId only
  // once a backfill migration normalizes the historical data.
  const hasAccess = await Application.exists({ candidateId: session.userId, recruiterId: new Types.ObjectId(recruiterId) });
  if (!hasAccess) throw new AppError('Access denied.', 403, true);
  const sk = session.skillId ? await Skill.findById(session.skillId).lean<ISkillDocument>() : null;
  const [answers, events] = await Promise.all([Answer.find({ sessionId: new Types.ObjectId(sessionId) }).sort({ createdAt: 1 }).lean<IAnswerDocument[]>(), Event.find({ sessionId: new Types.ObjectId(sessionId) }).sort({ timestamp: 1 }).lean<IEventDocument[]>()]);
  return { session: { _id: session._id.toString(), skillName: sk?.name ?? '', declaredTier: session.declaredTier, finalTier: session.finalTier ?? '', status: session.status, compositeScore: session.compositeScore ?? 0, conceptScore: session.conceptScore ?? 0, speedScore: session.speedScore ?? 0, consistencyScore: session.consistencyScore ?? 0, behaviorScore: session.behaviorScore ?? 0, aiScore: session.aiScore ?? 0, aiProbability: session.aiProbability ?? 0, strikeCount: session.strikeCount ?? 0, durationMs: session.durationMs ?? 0, startTime: session.startTime?.toISOString() ?? '', endTime: session.endTime?.toISOString() ?? '' }, answers: answers.map(a => ({ questionType: a.questionType, difficulty: a.difficulty, timeTaken: a.timeTaken, isCorrect: a.isCorrect, isTimeout: a.isTimeout, conceptScore: Math.round(a.conceptScore * 100), aiScore: Math.round(a.aiScore ?? 0) })), events: events.map(e => ({ eventType: e.eventType, timestamp: e.timestamp.toISOString(), strikeCount: e.strikeCount, tabHiddenMs: e.tabHiddenDuration ?? 0 })) };
}
export async function upsertPipeline(recruiterId: string, input: { candidateId: string; jobId?: string; status: string; note?: string }) {
  const { candidateId, jobId, status, note } = input;
  const filter = { candidateId: new Types.ObjectId(candidateId), recruiterId: new Types.ObjectId(recruiterId), ...(jobId ? { jobId: new Types.ObjectId(jobId) } : {}) };

  // Resolve the recruiter's real companyId.
  // Priority 1: if a jobId is provided, use that Job's companyId (most authoritative).
  // Priority 2: fall back to the recruiter's current/most-recent experience entry companyId.
  let companyId: Types.ObjectId | null = null;
  if (jobId) {
    const job = await Job.findById(jobId).select('companyId').lean<Pick<IJobDocument, '_id' | 'companyId'>>();
    if (job?.companyId) companyId = job.companyId;
  }
  if (!companyId) {
    const recruiter = await User.findById(recruiterId).select('experience').lean<Pick<IUserDocument, '_id' | 'experience'>>();
    if (recruiter?.experience?.length) {
      // Prefer a current experience with a populated companyId
      const current = recruiter.experience.find(e => e?.endDate?.isCurrent && e.companyId);
      const fallback = recruiter.experience.find(e => e.companyId);
      const resolved = (current ?? fallback)?.companyId ?? null;
      if (resolved) companyId = resolved as Types.ObjectId;
    }
  }
  if (!companyId) {
    throw new AppError('Recruiter has no associated company. Add a current company to your profile or post against a specific job.', 400, true);
  }

  const app = await Application.findOneAndUpdate(filter, { $set: { status, ...(note !== undefined ? { recruiterNote: note } : {}) }, $setOnInsert: { candidateId: new Types.ObjectId(candidateId), recruiterId: new Types.ObjectId(recruiterId), ...(jobId ? { jobId: new Types.ObjectId(jobId) } : {}), appliedAt: new Date(), companyId } }, { upsert: true, new: true });
  return { _id: app._id.toString(), candidateId, jobId: jobId ?? null, status: app.status, note: app.recruiterNote ?? '', recruiterId, createdAt: app.createdAt.toISOString(), updatedAt: app.updatedAt.toISOString() };
}
export async function getPipelineGrouped(recruiterId: string, jobId?: string) {
  const filter: Record<string, unknown> = { recruiterId: new Types.ObjectId(recruiterId) };
  if (jobId) filter['jobId'] = new Types.ObjectId(jobId);
  const apps = await Application.find(filter).sort({ updatedAt: -1 }).lean();
  const cids = [...new Set(apps.map(a => a.candidateId.toString()))];
  const [users, verifs] = await Promise.all([User.find({ _id: { $in: cids } }).select('firstName lastName headline profilePhoto customUrl').lean<IUserDocument[]>(), Verification.find({ userId: { $in: cids }, status: { $in: ['VERIFIED', 'FLAGGED'] } }).lean<IVerificationDocument[]>()]);
  const uMap = new Map(users.map(u => [u._id.toString(), u]));
  const vByU = new Map<string, IVerificationDocument[]>();
  for (const v of verifs) { const uid = v.userId.toString(); if (!vByU.has(uid)) vByU.set(uid, []); vByU.get(uid)!.push(v); }
  const stages = ['shortlisted', 'contacted', 'interviewing', 'offer', 'rejected', 'applied', 'viewed'];
  const grouped: Record<string, unknown[]> = Object.fromEntries(stages.map(s => [s, []]));
  for (const app of apps) {
    const cid = app.candidateId.toString(); const u = uMap.get(cid); const uv = vByU.get(cid) ?? [];
    const card = { applicationId: app._id.toString(), candidateId: cid, fullName: u ? `${u.firstName} ${u.lastName}` : '', headline: u?.headline ?? '', profilePhoto: u?.profilePhoto ?? '', customUrl: u?.customUrl ?? '', status: app.status, note: app.recruiterNote ?? '', appliedAt: app.appliedAt.toISOString(), verifiedSkills: uv.slice(0, 3).map(v => ({ skillId: v.skillId.toString(), skillName: '', skillSlug: '', tier: v.tier as SkillTier, compositeScore: v.compositeScore, issuedAt: v.issuedAt.toISOString(), status: v.status })), behaviorIntegrity: integrity(uv[0]?.behaviorScore ?? 100), aiFlag: Math.max(...uv.map(v => v.aiProbability ?? 0), 0) > 0.40 };
    const stage = app.status in grouped ? app.status : 'applied';
    (grouped[stage] as unknown[]).push(card);
  }
  return grouped;
}
export async function exportCandidatesCsv(recruiterId: string, filters: { jobId?: string; skillId?: string; tier?: string }): Promise<string> {
  const apps = await Application.find({ recruiterId: new Types.ObjectId(recruiterId) }).lean();
  const cids = apps.map(a => a.candidateId);
  const vf: Record<string, unknown> = { userId: { $in: cids }, status: { $in: ['VERIFIED', 'FLAGGED'] } };
  if (filters.skillId) vf['skillId'] = new Types.ObjectId(filters.skillId);
  if (filters.tier) vf['tier'] = filters.tier;
  const [users, verifs, sks] = await Promise.all([User.find({ _id: { $in: cids } }).select('firstName lastName email headline location').lean<IUserDocument[]>(), Verification.find(vf).lean<IVerificationDocument[]>(), Skill.find({}).select('name').lean<ISkillDocument[]>()]);
  const uMap = new Map(users.map(u => [u._id.toString(), u]));
  const skMap = new Map(sks.map(s => [s._id.toString(), s]));
  const rows = verifs.map(v => { const u = uMap.get(v.userId.toString()); const s = skMap.get(v.skillId.toString()); return { name: u ? `${u.firstName} ${u.lastName}` : '', email: u?.email ?? '', headline: u?.headline ?? '', city: u?.location?.city ?? '', country: u?.location?.country ?? '', skill: s?.name ?? '', tier: v.tier, compositeScore: v.compositeScore, verifiedAt: v.issuedAt.toISOString(), certificateId: v.certificateId }; });
  const headers = Object.keys(rows[0] ?? { name: '', email: '', headline: '', city: '', country: '', skill: '', tier: '', compositeScore: 0, verifiedAt: '', certificateId: '' }).join(',');
  return [headers, ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
}
