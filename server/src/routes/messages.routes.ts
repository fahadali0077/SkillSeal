// ─────────────────────────────────────────────────────────────────────────────
// messages.routes.ts  –  /api/v1/messages
// ─────────────────────────────────────────────────────────────────────────────
import { Router, Response } from 'express';
import { ApiErrorCode } from '@SkillSeal/shared';
import { authenticate, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import {
  listThreads, getThread, sendMessage, markThreadRead,
  deleteMessage, listRequests, acceptRequest, ignoreRequest, searchMessages,
} from '../services/messages.service';

const router = Router();
router.use(authenticate);

function handle(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    const code = err.statusCode === 403 ? ApiErrorCode.FORBIDDEN
      : err.statusCode === 404 ? ApiErrorCode.NOT_FOUND
        : err.statusCode === 400 ? ApiErrorCode.VALIDATION_ERROR
          : ApiErrorCode.INTERNAL_ERROR;
    sendError(res, err.message, err.statusCode, code);
  } else {
    sendError(res, 'Unexpected error', 500, ApiErrorCode.INTERNAL_ERROR);
  }
}

// GET /messages/threads
router.get('/threads', async (req: AuthRequest, res: Response) => {
  try {
    const threads = await listThreads(req.user!.userId);
    sendSuccess(res, threads, 'Threads retrieved');
  } catch (err) { handle(err, res); }
});

// GET /messages/threads/:threadId
router.get('/threads/:threadId', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt((req.query['page'] as string) ?? '1', 10);
    const limit = parseInt((req.query['limit'] as string) ?? '50', 10);
    const result = await getThread(req.params['threadId']!, req.user!.userId, page, Math.min(limit, 100));
    sendSuccess(res, result, 'Thread retrieved');
  } catch (err) { handle(err, res); }
});

// POST /messages/send
router.post('/send', async (req: AuthRequest, res: Response) => {
  try {
    const msg = await sendMessage(req.user!.userId, req.body as Parameters<typeof sendMessage>[1]);
    sendSuccess(res, msg, 'Message sent', 201);
  } catch (err) { handle(err, res); }
});

// PUT /messages/threads/:threadId/read
router.put('/threads/:threadId/read', async (req: AuthRequest, res: Response) => {
  try {
    await markThreadRead(req.params['threadId']!, req.user!.userId);
    sendSuccess(res, null, 'Marked as read');
  } catch (err) { handle(err, res); }
});

// DELETE /messages/:messageId
router.delete('/:messageId', async (req: AuthRequest, res: Response) => {
  try {
    const msg = await deleteMessage(req.params['messageId']!, req.user!.userId);
    sendSuccess(res, msg, 'Message deleted');
  } catch (err) { handle(err, res); }
});

// GET /messages/requests
router.get('/requests', async (req: AuthRequest, res: Response) => {
  try {
    const requests = await listRequests(req.user!.userId);
    sendSuccess(res, requests, 'Requests retrieved');
  } catch (err) { handle(err, res); }
});

// POST /messages/requests/:requestId/accept
router.post('/requests/:requestId/accept', async (req: AuthRequest, res: Response) => {
  try {
    await acceptRequest(req.params['requestId']!, req.user!.userId);
    sendSuccess(res, null, 'Request accepted');
  } catch (err) { handle(err, res); }
});

// POST /messages/requests/:requestId/ignore
router.post('/requests/:requestId/ignore', async (req: AuthRequest, res: Response) => {
  try {
    await ignoreRequest(req.params['requestId']!, req.user!.userId);
    sendSuccess(res, null, 'Request ignored');
  } catch (err) { handle(err, res); }
});

// GET /messages/search
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const query = (req.query['query'] as string) ?? '';
    const msgs = await searchMessages(req.user!.userId, query);
    sendSuccess(res, msgs, 'Search results');
  } catch (err) { handle(err, res); }
});

export default router;
