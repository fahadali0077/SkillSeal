import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { ApiErrorCode } from '@SkillSeal/shared';
import { authenticate, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { getSession, updateSession } from '../utils/redis';
import { Event } from '../models/Event.model';
import { Session } from '../models/Session.model';
import { emitToSession, SOCKET_EVENTS } from '../socket/socket';
import logger from '../utils/logger';
const router = Router(); router.use(authenticate);
router.post('/log', async (req: AuthRequest, res: Response) => {
  const { sessionId, eventType, questionId, timeOnQuestion, tabHiddenDurationMs } = req.body as Record<string, unknown>;
  if (!sessionId || !eventType) { sendError(res, 'sessionId and eventType required.', 400, ApiErrorCode.VALIDATION_ERROR); return; }
  try {
    const state = await getSession(String(sessionId));
    if (!state) { sendSuccess(res, { strikeCount: 0, action: 'log' }, 'Logged'); return; }
    if (state.isTerminated) { sendSuccess(res, { strikeCount: state.strikeCount, action: 'terminate' }, 'Already terminated'); return; }
    await Event.create({ sessionId: new Types.ObjectId(String(sessionId)), eventType, timestamp: new Date(), questionId: questionId ? new Types.ObjectId(String(questionId)) : null, timeOnQuestion: Number(timeOnQuestion ?? 0), strikeCount: state.strikeCount, tabHiddenDuration: Number(tabHiddenDurationMs ?? 0) });
    if (eventType === 'window-focus') { await updateSession(String(sessionId), {}); sendSuccess(res, { strikeCount: state.strikeCount, action: 'log' }, 'Logged'); return; }
    const newCount = state.strikeCount + 1;
    const action = newCount === 1 ? 'warning' : newCount === 2 ? 'penalty' : 'terminate';
    if (action !== 'terminate') {
      await updateSession(String(sessionId), { strikeCount: newCount });
      await Session.findByIdAndUpdate(sessionId, { $inc: { strikeCount: 1 }, $push: { violationLog: { eventType, timestamp: new Date(), details: `strike ${newCount}` } } });
      sendSuccess(res, { strikeCount: newCount, action }, 'Logged'); return;
    }
    await updateSession(String(sessionId), { strikeCount: newCount, isTerminated: true, terminationReason: 'strike_limit_reached' });
    await Session.findByIdAndUpdate(sessionId, { status: 'terminated', terminationReason: 'strike_limit_reached', endTime: new Date(), strikeCount: newCount, $push: { violationLog: { eventType, timestamp: new Date(), details: `terminal strike ${newCount}` } } });
    emitToSession(String(sessionId), SOCKET_EVENTS.SESSION_ACTION, { action: 'terminate', reason: 'Max violations', strikeCount: newCount });
    sendSuccess(res, { strikeCount: newCount, action: 'terminate' }, 'Session terminated');
  } catch (err) { sendError(res, 'Error', 500, ApiErrorCode.INTERNAL_ERROR); }
});
export default router;
