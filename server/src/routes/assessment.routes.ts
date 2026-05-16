import { Router, Response, Request, NextFunction } from 'express';
import { ApiErrorCode } from '@SkillSeal/shared';
import { authenticate, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import { isRedisReady } from '../config/redis';

function requireRedis(_req: Request, res: Response, next: NextFunction): void {
  if (!isRedisReady()) {
    sendError(res, 'Assessment service unavailable: Redis is not configured. Contact support.', 503, ApiErrorCode.INTERNAL_ERROR);
    return;
  }
  next();
}
import { startSession, submitAnswer, recordStrike, getSessionState, abandonSession } from '../services/assessment/session.service';
import { computeCompositeScore } from '../services/assessment/scoring.service';
import { issueCertificate } from '../services/assessment/certificate.service';
import { Session } from '../models/Session.model';
import { Answer } from '../models/Answer.model';
import type { ISessionDocument } from '../models/Session.model';
import { Verification } from '../models/Verification.model';
import { Skill } from '../models/Skill.model';
import mongoose from 'mongoose';
import type { SkillTier } from '@SkillSeal/shared';
const router = Router();
router.use(authenticate);
router.use(requireRedis);
function handle(err: unknown, res: Response) {
  if (err instanceof AppError) {
    const code = err.statusCode === 404 ? ApiErrorCode.NOT_FOUND
      : err.statusCode === 409 ? ApiErrorCode.CONFLICT
      : err.statusCode === 429 ? ApiErrorCode.RATE_LIMIT_EXCEEDED
      : ApiErrorCode.INTERNAL_ERROR;
    sendError(res, err.message, err.statusCode, code);
  } else {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[assessment route] Unhandled error:', err);
    sendError(res, `Session error: ${message}`, 500, ApiErrorCode.INTERNAL_ERROR);
  }
}
router.post('/abandon', async (req: AuthRequest, res: Response) => {
  try { await abandonSession(req.user!.userId); sendSuccess(res, {}, 'Session abandoned'); } catch (err) { handle(err, res); }
});
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
    let session = await Session.findOne({ _id: sessionId, userId: new mongoose.Types.ObjectId(req.user!.userId) }).lean<ISessionDocument>();
    if (!session) { sendError(res, 'Session not found.', 404, ApiErrorCode.NOT_FOUND); return; }

    // Self-heal: if session is still 'active' but all 20 answers are recorded,
    // certificate issuance must have failed silently. Issue it now.
    if (session.status === 'active') {
      const TOTAL_QUESTIONS = 20;
      const answerCount = await Answer.countDocuments({ sessionId: new mongoose.Types.ObjectId(sessionId) });
      if (answerCount >= TOTAL_QUESTIONS) {
        try {
          await issueCertificate(sessionId);
          session = await Session.findById(sessionId).lean<ISessionDocument>() as ISessionDocument;
        } catch (issueErr) {
          // Issuance failed — fall back to scoring without certificate so user sees their result
          const fallback = await computeCompositeScore(sessionId);
          await Session.findByIdAndUpdate(sessionId, {
            status: 'completed',
            endTime: new Date(),
            compositeScore: fallback.scores.compositeScore,
            conceptScore: fallback.scores.conceptScore,
            speedScore: fallback.scores.speedScore,
            consistencyScore: fallback.scores.consistencyScore,
            behaviorScore: fallback.scores.behaviorScore,
            aiScore: fallback.scores.aiScore,
            aiProbability: fallback.scores.aiProbability,
            finalTier: fallback.finalTier ?? session.declaredTier,
          });
          session = await Session.findById(sessionId).lean<ISessionDocument>() as ISessionDocument;
        }
      } else {
        sendError(res, `Session still in progress. ${answerCount}/${TOTAL_QUESTIONS} answered.`, 409, ApiErrorCode.CONFLICT);
        return;
      }
    }

    if (session.compositeScore && session.compositeScore > 0) {
      sendSuccess(res, { sessionId, status: session.status, finalTier: session.finalTier, scores: { compositeScore: session.compositeScore, conceptScore: session.conceptScore ?? 0, speedScore: session.speedScore ?? 0, consistencyScore: session.consistencyScore ?? 0, behaviorScore: session.behaviorScore ?? 0, aiScore: session.aiScore ?? 0, aiProbability: session.aiProbability ?? 0 }, verificationId: session.verificationId?.toString() ?? null, durationMs: session.durationMs ?? 0, completedAt: session.endTime?.toISOString() ?? new Date().toISOString(), retakeAfterDays: (session.compositeScore ?? 0) >= 70 ? 0 : (session.compositeScore ?? 0) >= 50 ? 7 : 14 }, 'Session report'); return;
    }
    const result = await computeCompositeScore(sessionId);
    sendSuccess(res, { sessionId, status: session.status, finalTier: result.finalTier, scores: result.scores, verificationId: session.verificationId?.toString() ?? null, durationMs: session.durationMs ?? 0, completedAt: session.endTime?.toISOString() ?? new Date().toISOString(), retakeAfterDays: result.retakeAfterDays }, 'Session report');
  } catch (err) { handle(err, res); }
});

// GET /sessions/my-verifications — all verified skills for the logged-in user
router.get('/my-verifications', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const verifs = await Verification.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ issuedAt: -1 })
      .lean();

    const skillIds = [...new Set(verifs.map((v) => v.skillId.toString()))];
    const skills   = await Skill.find({ _id: { $in: skillIds } }).lean();
    const skillMap = new Map(skills.map((s: any) => [s._id.toString(), s]));

    const data = verifs.map((v) => {
      const skill = skillMap.get(v.skillId.toString()) as any;
      return {
        verificationId: (v as any)._id.toString(),
        skillId:        v.skillId.toString(),
        skillName:      skill?.name    ?? 'Unknown',
        skillIcon:      skill?.icon    ?? '🔧',
        skillCategory:  skill?.category ?? '',
        tier:           v.tier,
        compositeScore: v.compositeScore,
        certificateId:  v.certificateId,
        status:         v.status,
        issuedAt:       v.issuedAt,
        expiresAt:      v.expiresAt,
        isExpired:      new Date(v.expiresAt) < new Date(),
      };
    });

    sendSuccess(res, data, 'Verifications retrieved');
  } catch (err) { handle(err, res); }
});

export default router;
