// ─────────────────────────────────────────────────────────────────────────────
// posts.routes.ts  –  /api/v1/posts
// ─────────────────────────────────────────────────────────────────────────────
import { Router, Response } from 'express';
import { ApiErrorCode } from '@SkillSeal/shared';
import { authenticate, optionalAuth, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import {
  createPost, getPost, deletePost,
  upsertReaction, removeReaction, addComment, repost, votePoll, getComments,
  scrapeLinkPreview, deleteComment, toggleCommentLike,
} from '../services/feed.service';

const router = Router();

function handleError(err: unknown, res: Response): void {
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

// POST /posts
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const post = await createPost(req.user!.userId, req.body as Parameters<typeof createPost>[1]);
    sendSuccess(res, post, 'Post created', 201);
  } catch (err) { handleError(err, res); }
});

// GET /posts/:id
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const post = await getPost(req.params['id']!, req.user?.userId);
    sendSuccess(res, post, 'Post retrieved');
  } catch (err) { handleError(err, res); }
});

// DELETE /posts/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await deletePost(req.params['id']!, req.user!.userId);
    sendSuccess(res, null, 'Post deleted');
  } catch (err) { handleError(err, res); }
});

// POST /posts/:id/like
router.post('/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { reaction } = req.body as { reaction?: string };
    if (!reaction) { sendError(res, 'reaction required', 400, ApiErrorCode.MISSING_REQUIRED_FIELD); return; }
    const summary = await upsertReaction(req.params['id']!, req.user!.userId, reaction);
    sendSuccess(res, summary, 'Reaction recorded');
  } catch (err) { handleError(err, res); }
});

// DELETE /posts/:id/like
router.delete('/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const summary = await removeReaction(req.params['id']!, req.user!.userId);
    sendSuccess(res, summary, 'Reaction removed');
  } catch (err) { handleError(err, res); }
});

// GET /posts/:id/comments
router.get('/:id/comments', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const comments = await getComments(req.params['id']!);
    sendSuccess(res, comments, 'Comments retrieved');
  } catch (err) { handleError(err, res); }
});

// POST /posts/:id/comments
router.post('/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const comment = await addComment(req.params['id']!, req.user!.userId, req.body as Parameters<typeof addComment>[2]);
    sendSuccess(res, comment, 'Comment added', 201);
  } catch (err) { handleError(err, res); }
});

// POST /posts/:id/vote
router.post('/:id/vote', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { optionId } = req.body as { optionId?: string };
    if (!optionId) { sendError(res, 'optionId required', 400, ApiErrorCode.MISSING_REQUIRED_FIELD); return; }
    const post = await votePoll(req.params['id']!, req.user!.userId, optionId);
    sendSuccess(res, post, 'Vote recorded');
  } catch (err) { handleError(err, res); }
});

// POST /posts/:id/repost
router.post('/:id/repost', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { commentary } = req.body as { commentary?: string };
    const post = await repost(req.params['id']!, req.user!.userId, commentary);
    sendSuccess(res, post, 'Reposted', 201);
  } catch (err) { handleError(err, res); }
});

// HIGH-04: POST /posts/scrape-link — fetch OG/meta tags for a URL.
router.post('/scrape-link', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body as { url?: string };
    if (!url) { sendError(res, 'url required', 400, ApiErrorCode.MISSING_REQUIRED_FIELD); return; }
    const preview = await scrapeLinkPreview(url);
    sendSuccess(res, preview, 'Link preview scraped');
  } catch (err) { handleError(err, res); }
});

// HIGH-07: DELETE /posts/:id/comments/:commentId — author owner only.
router.delete('/:id/comments/:commentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await deleteComment(req.params['id']!, req.params['commentId']!, req.user!.userId);
    sendSuccess(res, null, 'Comment deleted');
  } catch (err) { handleError(err, res); }
});

// HIGH-08: POST /posts/:id/comments/:commentId/like — toggle like on comment.
router.post('/:id/comments/:commentId/like', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await toggleCommentLike(req.params['id']!, req.params['commentId']!, req.user!.userId);
    sendSuccess(res, result, 'Comment like toggled');
  } catch (err) { handleError(err, res); }
});

export default router;
