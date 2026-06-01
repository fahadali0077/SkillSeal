// ─────────────────────────────────────────────────────────────────────────────
// jobDigest.job.ts
// HIGH-12: Daily email job that drains the per-user Redis digest queues
// populated by jobMatch.service.ts:notifyJobMatch() and sends a single email
// containing today's matched jobs.
// ─────────────────────────────────────────────────────────────────────────────

import cron from 'node-cron';
import { getRedis } from '../config/redis';
import { User } from '../models/User.model';
import type { IUserDocument } from '../models/User.model';
import { popJobDigest } from '../services/jobMatch.service';
import { sendJobDigestEmail } from '../services/email.service';
import logger from '../utils/logger';

const DIGEST_PREFIX = 'job_digest:';

async function processJobDigests(): Promise<void> {
  const redis = getRedis();
  // Find all queued digest keys. SCAN avoids blocking Redis for large keysets.
  let cursor = '0';
  const userIds: string[] = [];
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', `${DIGEST_PREFIX}*`, 'COUNT', 200);
    cursor = next;
    for (const k of keys) userIds.push(k.slice(DIGEST_PREFIX.length));
  } while (cursor !== '0');

  if (userIds.length === 0) {
    logger.info('[jobDigest] No queued digests.');
    return;
  }

  // Pull user docs for email + firstName resolution.
  const users = await User.find({ _id: { $in: userIds }, emailVerified: true })
    .select('_id email firstName')
    .lean<Pick<IUserDocument, '_id' | 'email' | 'firstName'>[]>();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  let sent = 0;
  for (const uid of userIds) {
    const u = userMap.get(uid);
    const jobs = await popJobDigest(uid);
    if (!u || jobs.length === 0) continue;
    try {
      await sendJobDigestEmail({ to: u.email, firstName: u.firstName, jobs });
      sent += 1;
    } catch (err) {
      logger.warn(`[jobDigest] send failed user=${uid}: ${(err as Error).message}`);
    }
  }
  logger.info(`[jobDigest] Sent ${sent}/${userIds.length} digests.`);
}

export function startJobDigestJob(): void {
  // Daily at 09:00 UTC.
  cron.schedule('0 9 * * *', async () => {
    logger.info('[jobDigest] Starting…');
    try { await processJobDigests(); }
    catch (err) { logger.error('[jobDigest] error:', err); }
  }, { timezone: 'UTC' });
  logger.info('[jobDigest] Scheduled daily 09:00 UTC');
}

export async function runNow(): Promise<void> { await processJobDigests(); }
