// ─────────────────────────────────────────────────────────────────────────────
// feed.routes.ts  –  /api/v1/feed  +  /api/v1/hashtags
// ─────────────────────────────────────────────────────────────────────────────
import { Router, Response } from 'express';
import { ApiErrorCode } from '@SkillSeal/shared';
import { authenticate, optionalAuth, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import { getFeed, getHashtagPosts, getTrendingHashtags } from '../services/feed.service';

const feedRouter = Router();
const hashtagRouter = Router();

function handleError(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, ApiErrorCode.INTERNAL_ERROR);
  } else {
    sendError(res, 'Unexpected error', 500, ApiErrorCode.INTERNAL_ERROR);
  }
}

// GET /feed
feedRouter.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt((req.query['page'] as string) ?? '1', 10);
    const limit = parseInt((req.query['limit'] as string) ?? '20', 10);
    const result = await getFeed(req.user!.userId, page, Math.min(limit, 50));
    sendSuccess(res, result, 'Feed retrieved');
  } catch (err) { handleError(err, res); }
});

// GET /hashtags/trending
hashtagRouter.get('/trending', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tags = await getTrendingHashtags(req.user!.userId);
    sendSuccess(res, tags, 'Trending hashtags');
  } catch (err) { handleError(err, res); }
});

// GET /hashtags/:tag/posts
hashtagRouter.get('/:tag/posts', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt((req.query['page'] as string) ?? '1', 10);
    const limit = parseInt((req.query['limit'] as string) ?? '20', 10);
    const result = await getHashtagPosts(req.params['tag']!, page, limit, req.user?.userId);
    sendSuccess(res, result, 'Hashtag posts');
  } catch (err) { handleError(err, res); }
});

export { feedRouter, hashtagRouter };
