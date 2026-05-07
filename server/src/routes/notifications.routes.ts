import { Router, Response } from 'express';
import { ApiErrorCode } from '@SkillSeal/shared';
import { authenticate, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import { listNotifications, getUnreadCount, markRead, markAllRead } from '../services/notifications.service';
const router = Router(); router.use(authenticate);
function handle(err: unknown, res: Response) { if (err instanceof AppError) sendError(res, err.message, err.statusCode, ApiErrorCode.INTERNAL_ERROR); else sendError(res, 'Error', 500, ApiErrorCode.INTERNAL_ERROR); }
router.get('/', async (req: AuthRequest, res: Response) => { try { const page = parseInt(req.query['page'] as string ?? '1', 10); const limit = Math.min(parseInt(req.query['limit'] as string ?? '20', 10), 50); const r = await listNotifications(req.user!.userId, page, limit); sendSuccess(res, r, 'Notifications'); } catch (err) { handle(err, res); } });
router.get('/unread-count', async (req: AuthRequest, res: Response) => { try { const count = await getUnreadCount(req.user!.userId); sendSuccess(res, { count }, 'Unread count'); } catch (err) { handle(err, res); } });
router.put('/read-all', async (req: AuthRequest, res: Response) => { try { await markAllRead(req.user!.userId); sendSuccess(res, null, 'Marked all read'); } catch (err) { handle(err, res); } });
router.put('/:id/read', async (req: AuthRequest, res: Response) => { try { await markRead(req.params['id']!, req.user!.userId); sendSuccess(res, null, 'Marked read'); } catch (err) { handle(err, res); } });
export default router;
