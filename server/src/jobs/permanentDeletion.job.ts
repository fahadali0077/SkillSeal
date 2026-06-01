// ─────────────────────────────────────────────────────────────────────────────
// permanentDeletion.job.ts
// HIGH-18: Daily cron that permanently removes User documents whose
// `scheduledDeletionAt` has passed. The associated user-owned data
// (Posts, Messages, Threads, Notifications, Applications, Connections) was
// already deleted at request time in privacy.routes.ts DELETE /:id — this
// cron simply removes the User document itself after the 30-day grace.
// ─────────────────────────────────────────────────────────────────────────────

import cron from 'node-cron';
import { User } from '../models/User.model';
import { Verification } from '../models/Verification.model';
import logger from '../utils/logger';

async function processPermanentDeletions(): Promise<void> {
  const now = new Date();
  const stale = await User.find({ scheduledDeletionAt: { $ne: null, $lte: now } })
    .select('_id')
    .lean<{ _id: import('mongoose').Types.ObjectId }[]>();

  if (stale.length === 0) {
    logger.info('[permDelete] No accounts past grace period.');
    return;
  }

  for (const u of stale) {
    // Final sweep — make absolutely sure no residual data is left behind in
    // case any was created after the soft-delete (e.g. a job recommendation).
    await Verification.deleteMany({ userId: u._id });
    await User.deleteOne({ _id: u._id });
    logger.info(`[permDelete] Permanently removed userId=${u._id.toString()}`);
  }
  logger.info(`[permDelete] Removed ${stale.length} accounts.`);
}

export function startPermanentDeletionJob(): void {
  // Run daily at 04:00 UTC, before the cert expiry job at 08:00.
  cron.schedule('0 4 * * *', async () => {
    logger.info('[permDelete] Starting…');
    try { await processPermanentDeletions(); }
    catch (err) { logger.error('[permDelete] error:', err); }
  }, { timezone: 'UTC' });
  logger.info('[permDelete] Scheduled daily 04:00 UTC');
}

export async function runNow(): Promise<void> { await processPermanentDeletions(); }
