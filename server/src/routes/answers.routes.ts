import { Router, Response } from 'express';
import { ApiErrorCode } from '@SkillSeal/shared';
import { authenticate, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import { getSession, getAnswer } from '../utils/redis';
import { submitAnswer } from '../services/assessment/session.service';
const router = Router(); router.use(authenticate);
const TIMERS: Record<string, number> = { mcq: 60, scenario: 120, 'micro-theory': 150 };
const BUFFER = 2000;
router.post('/submit', async (req: AuthRequest, res: Response) => {
  const { sessionId, questionId, selectedOption, textAnswer, timeTaken, isTimeout, submittedAt } = req.body as Record<string, unknown>;
  if (!sessionId || !questionId) { sendError(res, 'sessionId and questionId required.', 400, ApiErrorCode.VALIDATION_ERROR); return; }
  try {
    const state = await getSession(String(sessionId));
    if (!state) { sendError(res, 'Session expired.', 404, ApiErrorCode.SESSION_NOT_FOUND); return; }
    if (state.isTerminated) { sendError(res, 'Session terminated.', 409, ApiErrorCode.SESSION_TERMINATED); return; }
    if (!isTimeout) {
      const elapsed = Date.now() - state.questionStartTime;
      const stored = await getAnswer(String(sessionId), String(questionId));
      const qt = stored?.questionType ?? 'mcq';
      const allowed = (TIMERS[qt] ?? 60) * 1000 + BUFFER;
      if (elapsed > allowed) { sendError(res, 'Answer too late.', 400, ApiErrorCode.INVALID_ANSWER); return; }
    }
    const result = await submitAnswer({ sessionId: String(sessionId), questionId: String(questionId), selectedOption: selectedOption as string | null, textAnswer: String(textAnswer ?? ''), timeTakenMs: Number(timeTaken ?? 0), isTimeout: Boolean(isTimeout) });
    sendSuccess(res, { accepted: true, isCorrect: result.isCorrect, conceptScore: result.conceptScore, sessionComplete: result.isComplete, ...(result.isComplete ? { scoreResult: result.sessionState } : {}), sessionState: result.sessionState, nextQuestion: result.nextQuestion }, result.isComplete ? 'Session complete' : 'Answer accepted');
  } catch (err) { if (err instanceof AppError) sendError(res, err.message, err.statusCode, ApiErrorCode.INTERNAL_ERROR); else sendError(res, 'Error', 500, ApiErrorCode.INTERNAL_ERROR); }
});
export default router;
