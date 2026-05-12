// ─────────────────────────────────────────────────────────────────────────────
// connections.routes.ts  –  /api/v1/connections
// ─────────────────────────────────────────────────────────────────────────────
import { Router, Request, Response } from 'express';
import { ApiErrorCode } from '@SkillSeal/shared';
import { authenticate, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import {
  sendRequest, acceptRequest, declineRequest, removeConnection, removeConnectionByUserId,
  blockUser, unblockUser, followUser, unfollowUser,
  listConnections, getPendingRequests, getSentRequests,
} from '../services/connections.service';
import { getPeopleYouMayKnow } from '../services/suggestions.service';

const router = Router();

// All connection routes require authentication
router.use(authenticate);

function handleError(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    let code = ApiErrorCode.INTERNAL_ERROR;
    const msg = err.message.toLowerCase();
    if (msg.includes('already connected') || msg.includes('pending request')) code = ApiErrorCode.ALREADY_EXISTS;
    else if (msg.includes('weekly') || msg.includes('maximum')) code = ApiErrorCode.RATE_LIMIT_EXCEEDED;
    else if (msg.includes('forbidden')) code = ApiErrorCode.FORBIDDEN;
    else if (msg.includes('not found')) code = ApiErrorCode.NOT_FOUND;
    else if (msg.includes('yourself')) code = ApiErrorCode.CANNOT_SELF_CONNECT;
    else if (msg.includes('cannot be sent')) code = ApiErrorCode.BLOCKED_BY_USER;
    else if (msg.includes('no longer pending') || msg.includes('cannot be removed')) code = ApiErrorCode.CONFLICT;
    sendError(res, err.message, err.statusCode, code);
  } else {
    sendError(res, 'Unexpected error', 500, ApiErrorCode.INTERNAL_ERROR);
  }
}

// ── GET /connections ──────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, page, limit } = req.query as Record<string, string>;
    const result = await listConnections(
      req.user!.userId,
      search,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    sendSuccess(res, result, 'Connections retrieved');
  } catch (err) { handleError(err, res); }
});

// ── GET /connections/pending ──────────────────────────────────────────────────
router.get('/pending', async (req: AuthRequest, res: Response) => {
  try {
    const requests = await getPendingRequests(req.user!.userId);
    sendSuccess(res, requests, 'Pending requests retrieved');
  } catch (err) { handleError(err, res); }
});

// ── GET /connections/sent ─────────────────────────────────────────────────────
router.get('/sent', async (req: AuthRequest, res: Response) => {
  try {
    const requests = await getSentRequests(req.user!.userId);
    sendSuccess(res, requests, 'Sent requests retrieved');
  } catch (err) { handleError(err, res); }
});

// ── POST /connections/request ─────────────────────────────────────────────────
router.post('/request', async (req: AuthRequest, res: Response) => {
  try {
    const { recipientId, note } = req.body as { recipientId?: string; note?: string };
    if (!recipientId) { sendError(res, 'recipientId required', 400, ApiErrorCode.MISSING_REQUIRED_FIELD); return; }
    const conn = await sendRequest(req.user!.userId, recipientId, note);
    sendSuccess(res, { connectionId: conn._id.toString() }, 'Connection request sent', 201);
  } catch (err) { handleError(err, res); }
});

// ── PUT /connections/:id/accept ───────────────────────────────────────────────
router.put('/:id/accept', async (req: AuthRequest, res: Response) => {
  try {
    await acceptRequest(req.params['id']!, req.user!.userId);
    sendSuccess(res, null, 'Connection accepted');
  } catch (err) { handleError(err, res); }
});

// ── PUT /connections/:id/decline ──────────────────────────────────────────────
router.put('/:id/decline', async (req: AuthRequest, res: Response) => {
  try {
    await declineRequest(req.params['id']!, req.user!.userId);
    sendSuccess(res, null, 'Request declined');
  } catch (err) { handleError(err, res); }
});

// ── DELETE /connections/with/:userId ─────────────────────────────────────────
// Removes a connection by the OTHER user's ID (no connection doc ID needed).
// ConnectionsList only has UserMini objects (user _ids), not connection doc ids.
router.delete('/with/:userId', async (req: AuthRequest, res: Response) => {
  try {
    await removeConnectionByUserId(req.user!.userId, req.params['userId']!);
    sendSuccess(res, null, 'Connection removed');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to remove connection';
    sendError(res, msg, err instanceof AppError ? err.statusCode : 500);
  }
});

// ── DELETE /connections/:id ───────────────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await removeConnection(req.params['id']!, req.user!.userId);
    sendSuccess(res, null, 'Connection removed');
  } catch (err) { handleError(err, res); }
});

export default router;
