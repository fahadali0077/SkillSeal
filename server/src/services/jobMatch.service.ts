// ─────────────────────────────────────────────────────────────────────────────
// jobMatch.service.ts
// Matches new jobs / new verifications against candidates and emits
// real-time notifications + queues daily email digests.
// ─────────────────────────────────────────────────────────────────────────────

import { Types } from 'mongoose';
import { Job }   from '../models/Job.model';
import type { IJobDocument } from '../models/Job.model';
import { User }  from '../models/User.model';
import type { IUserDocument } from '../models/User.model';
import { emitToUser, SOCKET_EVENTS } from '../socket/socket';
import { getRedis } from '../config/redis';
import logger from '../utils/logger';

const DIGEST_PREFIX = 'job_digest:';
const DIGEST_TTL    = 24 * 60 * 60; // 24h

// ── Find matching candidates for a job ────────────────────────────────────────

async function findMatchingCandidates(job: IJobDocument): Promise<IUserDocument[]> {
  const requiredSkillIds = job.requiredSkills
    .filter((s) => s.required)
    .map((s) => s.skillId);

  if (requiredSkillIds.length === 0) return [];

  // Find candidates who have at least one required skill
  const candidates = await User.find({
    role:          'candidate',
    emailVerified: true,
    'skills.skillId': { $in: requiredSkillIds },
    $or: [
      { 'location.country': { $regex: job.location, $options: 'i' } },
      { 'location.city':    { $regex: job.location, $options: 'i' } },
      // Always include if job is remote
      ...(job.workType === 'remote' ? [{}] : []),
    ],
  })
  .select('_id firstName email skills location openToWork')
  .limit(500)
  .lean<IUserDocument[]>();

  return candidates;
}

// ── Emit job match notifications for a newly posted job ───────────────────────

export async function notifyJobMatch(jobId: string): Promise<void> {
  try {
    const job = await Job.findById(jobId).lean<IJobDocument>();
    if (!job || job.status !== 'active') return;

    const candidates = await findMatchingCandidates(job);
    const redis      = getRedis();

    for (const candidate of candidates) {
      // Real-time socket notification
      emitToUser(candidate._id.toString(), SOCKET_EVENTS.NOTIFICATION, {
        type:    'job_match',
        payload: {
          jobId:   job._id.toString(),
          title:   job.title,
          company: job.companyId.toString(),
        },
      });

      // Queue for daily digest
      const digestKey = `${DIGEST_PREFIX}${candidate._id.toString()}`;
      await redis.lpush(digestKey, JSON.stringify({
        jobId:   job._id.toString(),
        title:   job.title,
        postedAt: new Date().toISOString(),
      }));
      // Set TTL only if not already set
      await redis.expire(digestKey, DIGEST_TTL);
    }

    logger.info(`[jobMatch] Notified ${candidates.length} candidates for job=${jobId}`);
  } catch (err) {
    logger.error('[jobMatch] notifyJobMatch error:', err);
  }
}

// ── Run match on new skill verification ───────────────────────────────────────
// Called after a skill is verified to surface new job opportunities.

export async function runMatchOnVerification(
  userId: string,
  skillId: string,
): Promise<void> {
  try {
    const user = await User.findById(userId).lean<IUserDocument>();
    if (!user) return;

    // Find active jobs requiring this skill
    const jobs = await Job.find({
      status: 'active',
      'requiredSkills.skillId': new Types.ObjectId(skillId),
    }).limit(10).lean<IJobDocument[]>();

    if (jobs.length === 0) return;

    emitToUser(userId, SOCKET_EVENTS.NOTIFICATION, {
      type:    'job_match_post_verify',
      payload: {
        count:    jobs.length,
        skillId,
        message:  `Your new verified skill matches ${jobs.length} open job${jobs.length > 1 ? 's' : ''}!`,
        jobIds:   jobs.map((j) => j._id.toString()),
      },
    });

    logger.info(`[jobMatch] Post-verify match: userId=${userId} skillId=${skillId} jobs=${jobs.length}`);
  } catch (err) {
    logger.error('[jobMatch] runMatchOnVerification error:', err);
  }
}

// ── Retrieve and clear digest for a user (called by daily email job) ──────────

export async function popJobDigest(userId: string): Promise<{ jobId: string; title: string; postedAt: string }[]> {
  const redis    = getRedis();
  const digestKey = `${DIGEST_PREFIX}${userId}`;
  const raw      = await redis.lrange(digestKey, 0, -1);
  await redis.del(digestKey);
  return raw.map((r) => JSON.parse(r) as { jobId: string; title: string; postedAt: string });
}
