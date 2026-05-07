import { Router, Response } from 'express';
import { ApiErrorCode } from '@SkillSeal/shared';
import { authenticate, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import { startSession, submitAnswer, recordStrike, getSessionState } from '../services/assessment/session.service';
import { computeCompositeScore } from '../services/assessment/scoring.service';
import { Session } from '../models/Session.model';
import type { ISessionDocument } from '../models/Session.model';
import mongoose from 'mongoose';
import type { SkillTier } from '@SkillSeal/shared';
const router = Router();
router.use(authenticate);
function handle(err: unknown, res: Response) {
  if (err instanceof AppError) { const code = err.statusCode === 404 ? ApiErrorCode.NOT_FOUND : err.statusCode === 409 ? ApiErrorCode.CONFLICT : err.statusCode === 429 ? ApiErrorCode.RATE_LIMIT_EXCEEDED : ApiErrorCode.INTERNAL_ERROR; sendError(res, err.message, err.statusCode, code); }
  else sendError(res, 'Unexpected error', 500, ApiErrorCode.INTERNAL_ERROR);
}
router.post('/start', async (req: AuthRequest, res: Response) => {
  try { const { skillId, tier } = req.body as { skillId?: string; tier?: string }; if (!skillId || !tier) { sendError(res, 'skillId and tier required.', 400, ApiErrorCode.VALIDATION_ERROR); return; } const r = await startSession({ userId: req.user!.userId, skillId, tier: tier as SkillTier }); sendSuccess(res, r, 'Session started', 201); } catch (err) { handle(err, res); }
});
router.post('/:id/answer', async (req: AuthRequest, res: Response) => {
  try { const r = await submitAnswer({ sessionId: req.params['id']!, ...req.body as Record<string, unknown> } as Parameters<typeof submitAnswer>[0]); sendSuccess(res, r, r.isComplete ? 'Session complete' : 'Answer recorded'); } catch (err) { handle(err, res); }
});
router.post('/:id/strike', async (req: AuthRequest, res: Response) => {
  try { const { eventType, details } = req.body as { eventType: string; details?: string }; const r = await recordStrike(req.params['id']!, eventType, details); sendSuccess(res, r, r.terminated ? 'Session terminated' : 'Strike recorded'); } catch (err) { handle(err, res); }
});
router.get('/:id/state', async (req: AuthRequest, res: Response) => {
  try { const s = await getSessionState(req.params['id']!, req.user!.userId); if (!s) { sendError(res, 'Session not found.', 404, ApiErrorCode.NOT_FOUND); return; } sendSuccess(res, s, 'Session state'); } catch (err) { handle(err, res); }
});
router.get('/:id/report', async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.params['id']!;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) { sendError(res, 'Invalid session ID.', 400, ApiErrorCode.VALIDATION_ERROR); return; }
    const session = await Session.findOne({ _id: sessionId, userId: new mongoose.Types.ObjectId(req.user!.userId) }).lean<ISessionDocument>();
    if (!session) { sendError(res, 'Session not found.', 404, ApiErrorCode.NOT_FOUND); return; }
    if (session.status === 'active') { sendError(res, 'Session still in progress.', 409, ApiErrorCode.CONFLICT); return; }
    if (session.compositeScore && session.compositeScore > 0) {
      sendSuccess(res, { sessionId, status: session.status, finalTier: session.finalTier, scores: { compositeScore: session.compositeScore, conceptScore: session.conceptScore ?? 0, speedScore: session.speedScore ?? 0, consistencyScore: session.consistencyScore ?? 0, behaviorScore: session.behaviorScore ?? 0, aiScore: session.aiScore ?? 0, aiProbability: session.aiProbability ?? 0 }, verificationId: session.verificationId?.toString() ?? null, durationMs: session.durationMs ?? 0, completedAt: session.endTime?.toISOString() ?? new Date().toISOString(), retakeAfterDays: (session.compositeScore ?? 0) >= 70 ? 0 : (session.compositeScore ?? 0) >= 50 ? 7 : 14 }, 'Session report'); return;
    }
    const result = await computeCompositeScore(sessionId);
    sendSuccess(res, { sessionId, status: session.status, finalTier: result.finalTier, scores: result.scores, verificationId: session.verificationId?.toString() ?? null, durationMs: session.durationMs ?? 0, completedAt: session.endTime?.toISOString() ?? new Date().toISOString(), retakeAfterDays: result.retakeAfterDays }, 'Session report');
  } catch (err) { handle(err, res); }
});
export default router;
