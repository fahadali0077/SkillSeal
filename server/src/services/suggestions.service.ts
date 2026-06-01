// ─────────────────────────────────────────────────────────────────────────────
// suggestions.service.ts
// People You May Know (PYMK) algorithm with Redis caching.
//
// Scoring weights:
//   Mutual connection   → +5 pts each (max 25)
//   Same employer       → +15 pts
//   Same education      → +10 pts
//   Same verified skill → +8 pts (per matching skill)
//   Profile viewed me   → +12 pts  (last 7 days)
//   Same city           → +5 pts
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Types } from 'mongoose';
import { User }        from '../models/User.model';
import type { IUserDocument } from '../models/User.model';
import { Connection }  from '../models/Connection.model';
import type { IConnectionDocument } from '../models/Connection.model';
import { getRedis }    from '../config/redis';
import logger          from '../utils/logger';

const CACHE_TTL  = 60 * 60;          // 1 hour
const MAX_RETURN = 20;

// ── Public output shape ───────────────────────────────────────────────────────

export interface SuggestedUser {
  userId:          string;
  fullName:        string;
  firstName:       string;
  lastName:        string;
  headline:        string;
  profilePhoto:    string;
  customUrl:       string;
  connectionCount: number;
  mutualCount:     number;
  score:           number;
  reason:          string;   // primary reason for surfacing this user
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

function cacheKey(userId: string) { return `suggestions:${userId}`; }

export async function bustSuggestionsCache(userId: string): Promise<void> {
  await getRedis().del(cacheKey(userId));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main algorithm
// ─────────────────────────────────────────────────────────────────────────────

export async function getPeopleYouMayKnow(viewerId: string): Promise<SuggestedUser[]> {
  const redis  = getRedis();
  const cached = await redis.get(cacheKey(viewerId));
  if (cached) {
    try { return JSON.parse(cached) as SuggestedUser[]; }
    catch { /* corrupt cache — fall through */ }
  }

  const viewer = await User.findById(viewerId).lean<IUserDocument>();
  if (!viewer) return [];

  // ── Build exclusion set: self, already connected, pending, blocked ─────────
  const myConnectionIds = (viewer.connections ?? []).map((id) => id.toString());
  const myBlockedIds    = (viewer.blockedUsers ?? []).map((id) => id.toString());

  const pendingConns = await Connection.find({
    $or: [{ requesterId: viewerId }, { recipientId: viewerId }],
    status: 'pending',
  }).lean<IConnectionDocument[]>();

  const pendingIds = pendingConns.flatMap((c) => [
    c.requesterId.toString(),
    c.recipientId.toString(),
  ]);

  const excludeIds = new Set([
    viewerId,
    ...myConnectionIds,
    ...myBlockedIds,
    ...pendingIds,
  ]);

  // ── 1. Mutual connections candidates (2nd-degree users) ───────────────────
  const mutualMap = new Map<string, number>(); // candidateId → mutual count

  if (myConnectionIds.length > 0) {
    const friendDocs = await User.find({
      _id: { $in: myConnectionIds.map((id) => new Types.ObjectId(id)) },
    }).select('connections').lean<{ _id: Types.ObjectId; connections: Types.ObjectId[] }[]>();

    for (const friend of friendDocs) {
      for (const connId of friend.connections ?? []) {
        const id = connId.toString();
        if (!excludeIds.has(id)) {
          mutualMap.set(id, (mutualMap.get(id) ?? 0) + 1);
        }
      }
    }
  }

  // ── 2. Build candidate pool ───────────────────────────────────────────────
  // Take top 100 by mutual count + up to 200 random active users
  const mutualCandidates = [...mutualMap.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 100)
    .map(([id]) => id);

  // PARTIAL-02: use $sample so the random candidate pool is genuinely random
  // each request. The previous `.find().limit(200)` returned the same 200
  // documents (insertion order) every time, which meant new users always saw
  // the same suggestions and suggestion quality decayed for active accounts.
  const randomCandidates = await User.aggregate<{ _id: Types.ObjectId }>([
    { $match: {
      _id: { $nin: [...excludeIds].map((id) => new Types.ObjectId(id)) },
      emailVerified: true,
    } },
    { $sample: { size: 200 } },
    { $project: { _id: 1 } },
  ]);

  const candidateIdSet = new Set([
    ...mutualCandidates,
    ...randomCandidates.map((u) => u._id.toString()),
  ]);
  excludeIds.forEach((id) => candidateIdSet.delete(id));

  if (candidateIdSet.size === 0) return [];

  // ── 3. Load candidate documents ───────────────────────────────────────────
  const candidateDocs = await User.find({
    _id: { $in: [...candidateIdSet].map((id) => new Types.ObjectId(id)) },
  }).lean<IUserDocument[]>();

  // ── 4. Viewer context for scoring ─────────────────────────────────────────
  const myCurrentCompany = viewer.experience?.find((e) => e.endDate?.isCurrent)?.company ?? '';
  const myInstitutions   = new Set(viewer.education?.map((e) => e.institution) ?? []);
  const myVerifiedSkills = new Map(
    (viewer.skills ?? [])
      .filter((s) => s.status === 'verified')
      .map((s) => [s.skillId.toString(), true]),
  );
  const myCity = viewer.location?.city ?? '';

  // ── 5. Score each candidate ───────────────────────────────────────────────
  const scored: (SuggestedUser & { rawScore: number })[] = [];

  for (const doc of candidateDocs) {
    const uid = doc._id.toString();
    let score  = 0;
    const reasons: string[] = [];

    // Mutual connections (5 pts each, max 25)
    const mutual = mutualMap.get(uid) ?? 0;
    if (mutual > 0) {
      const pts = Math.min(mutual * 5, 25);
      score += pts;
      reasons.push(`${mutual} mutual connection${mutual > 1 ? 's' : ''}`);
    }

    // Same employer (15 pts)
    const theirCompany = doc.experience?.find((e) => e.endDate?.isCurrent)?.company ?? '';
    if (myCurrentCompany && theirCompany && myCurrentCompany.toLowerCase() === theirCompany.toLowerCase()) {
      score += 15;
      reasons.push(`Works at ${theirCompany}`);
    }

    // Same education (10 pts)
    const theirInstitutions = doc.education?.map((e) => e.institution) ?? [];
    const sharedEdu = theirInstitutions.find((inst) => myInstitutions.has(inst));
    if (sharedEdu) {
      score += 10;
      reasons.push(`Studied at ${sharedEdu}`);
    }

    // Same verified skill (8 pts per shared verified skill)
    const theirVerified = (doc.skills ?? []).filter((s) => s.status === 'verified');
    let sharedSkillCount = 0;
    for (const s of theirVerified) {
      if (myVerifiedSkills.has(s.skillId.toString())) sharedSkillCount++;
    }
    if (sharedSkillCount > 0) {
      score += sharedSkillCount * 8;
      reasons.push(`${sharedSkillCount} shared verified skill${sharedSkillCount > 1 ? 's' : ''}`);
    }

    // Same city (5 pts)
    if (myCity && doc.location?.city && myCity.toLowerCase() === doc.location.city.toLowerCase()) {
      score += 5;
      reasons.push(`Lives in ${doc.location.city}`);
    }

    // Profile view signal (+12) would require Event model lookup — skipped here
    // to avoid N+1; implement as a batch lookup if needed.

    if (score <= 0) score = 1; // ensure all candidates get at least 1 pt

    scored.push({
      userId:          uid,
      fullName:        `${doc.firstName} ${doc.lastName}`,
      firstName:       doc.firstName,
      lastName:        doc.lastName,
      headline:        doc.headline ?? '',
      profilePhoto:    doc.profilePhoto ?? '',
      customUrl:       doc.customUrl ?? '',
      connectionCount: doc.connections?.length ?? 0,
      mutualCount:     mutual,
      score,
      reason:          reasons[0] ?? 'People you may know',
      rawScore:        score,
    });
  }

  // ── 6. Sort + cap ─────────────────────────────────────────────────────────
  const results: SuggestedUser[] = scored
    .sort((a, b) => b.rawScore - a.rawScore)
    .slice(0, MAX_RETURN)
    .map(({ rawScore: _r, ...rest }) => rest);

  // ── 7. Cache ──────────────────────────────────────────────────────────────
  await redis.set(cacheKey(viewerId), JSON.stringify(results), 'EX', CACHE_TTL);
  logger.info(`[suggestions] Computed ${results.length} suggestions for userId=${viewerId}`);

  return results;
}
