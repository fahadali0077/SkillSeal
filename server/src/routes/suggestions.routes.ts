// ─────────────────────────────────────────────────────────────────────────────
// suggestions.routes.ts  –  /api/v1/suggestions
// Also adds block/follow sub-routes that belong to /api/v1/users/:id
// ─────────────────────────────────────────────────────────────────────────────
import { Router, Response } from 'express';
import { ApiErrorCode } from '@SkillSeal/shared';
import { authenticate, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import { blockUser, unblockUser, followUser, unfollowUser } from '../services/connections.service';
import { getPeopleYouMayKnow } from '../services/suggestions.service';

const router = Router();
router.use(authenticate);

function handleError(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, ApiErrorCode.INTERNAL_ERROR);
  } else {
    sendError(res, 'Unexpected error', 500, ApiErrorCode.INTERNAL_ERROR);
  }
}

// ── GET /suggestions/people ───────────────────────────────────────────────────
router.get('/people', async (req: AuthRequest, res: Response) => {
  try {
    const suggestions = await getPeopleYouMayKnow(req.user!.userId);
    sendSuccess(res, suggestions, 'Suggestions retrieved');
  } catch (err) { handleError(err, res); }
});

// ── POST /suggestions/users/:id/block ─────────────────────────────────────────
router.post('/users/:id/block', async (req: AuthRequest, res: Response) => {
  try {
    await blockUser(req.user!.userId, req.params['id']!);
    sendSuccess(res, null, 'User blocked');
  } catch (err) { handleError(err, res); }
});

// ── DELETE /suggestions/users/:id/block ──────────────────────────────────────
router.delete('/users/:id/block', async (req: AuthRequest, res: Response) => {
  try {
    await unblockUser(req.user!.userId, req.params['id']!);
    sendSuccess(res, null, 'User unblocked');
  } catch (err) { handleError(err, res); }
});

// ── POST /suggestions/users/:id/follow ───────────────────────────────────────
router.post('/users/:id/follow', async (req: AuthRequest, res: Response) => {
  try {
    await followUser(req.user!.userId, req.params['id']!);
    sendSuccess(res, null, 'Now following');
  } catch (err) { handleError(err, res); }
});

// ── DELETE /suggestions/users/:id/follow ─────────────────────────────────────
router.delete('/users/:id/follow', async (req: AuthRequest, res: Response) => {
  try {
    await unfollowUser(req.user!.userId, req.params['id']!);
    sendSuccess(res, null, 'Unfollowed');
  } catch (err) { handleError(err, res); }
});

export default router;
