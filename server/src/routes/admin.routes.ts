// ─────────────────────────────────────────────────────────────────────────────
// admin.routes.ts — /api/v1/admin
// All routes require an authenticated platform_admin. The guard is applied once
// at the router level so no individual handler can be reached without it.
// ─────────────────────────────────────────────────────────────────────────────

import { Router, type Response } from 'express';
import { ApiErrorCode } from '@SkillSeal/shared';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import * as admin from '../services/admin.service';

const router = Router();
router.use(authenticate, requireRole('platform_admin'));

function handle(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    const code = err.statusCode === 403 ? ApiErrorCode.FORBIDDEN
      : err.statusCode === 404 ? ApiErrorCode.NOT_FOUND
      : err.statusCode === 409 ? ApiErrorCode.CONFLICT
      : err.statusCode === 400 ? ApiErrorCode.VALIDATION_ERROR
      : ApiErrorCode.INTERNAL_ERROR;
    sendError(res, err.message, err.statusCode, code);
    return;
  }
  const msg = err instanceof Error ? err.message : String(err);
  sendError(res, `Admin error: ${msg}`, 500, ApiErrorCode.INTERNAL_ERROR);
}

// ── Dashboard ────────────────────────────────────────────────────────────────
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try { sendSuccess(res, await admin.getDashboardStats(), 'Stats'); } catch (err) { handle(err, res); }
});

// ── Users ────────────────────────────────────────────────────────────────────
router.get('/users', async (req: AuthRequest, res: Response) => {
  try { sendSuccess(res, await admin.listUsers(req.query), 'Users'); } catch (err) { handle(err, res); }
});
router.get('/users/:id', async (req: AuthRequest, res: Response) => {
  try { sendSuccess(res, await admin.getUserDetail(req.params['id']!), 'User'); } catch (err) { handle(err, res); }
});
router.patch('/users/:id/role', async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body as { role?: string };
    if (!role) { sendError(res, 'role is required.', 400, ApiErrorCode.VALIDATION_ERROR); return; }
    sendSuccess(res, await admin.updateUserRole(req.user!.userId, req.params['id']!, role), 'Role updated');
  } catch (err) { handle(err, res); }
});
router.patch('/users/:id/suspend', async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body as { reason?: string };
    sendSuccess(res, await admin.suspendUser(req.user!.userId, req.params['id']!, reason ?? ''), 'User suspended');
  } catch (err) { handle(err, res); }
});
router.patch('/users/:id/reactivate', async (req: AuthRequest, res: Response) => {
  try { sendSuccess(res, await admin.reactivateUser(req.user!.userId, req.params['id']!), 'User reactivated'); } catch (err) { handle(err, res); }
});
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const immediate = req.query['immediate'] === 'true';
    sendSuccess(res, await admin.deleteUser(req.user!.userId, req.params['id']!, immediate), immediate ? 'User deleted' : 'Deletion scheduled');
  } catch (err) { handle(err, res); }
});

// ── Verifications ────────────────────────────────────────────────────────────
router.get('/verifications', async (req: AuthRequest, res: Response) => {
  try { sendSuccess(res, await admin.listVerifications(req.query), 'Verifications'); } catch (err) { handle(err, res); }
});
router.patch('/verifications/:id/revoke', async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body as { reason?: string };
    sendSuccess(res, await admin.revokeVerification(req.user!.userId, req.params['id']!, reason ?? ''), 'Verification revoked');
  } catch (err) { handle(err, res); }
});

// ── Skills (catalog) ───────────────────────────────────────────────────────────
router.get('/skills', async (_req: AuthRequest, res: Response) => {
  try { sendSuccess(res, await admin.listSkills(), 'Skills'); } catch (err) { handle(err, res); }
});
router.post('/skills', async (req: AuthRequest, res: Response) => {
  try { sendSuccess(res, await admin.createSkill(req.user!.userId, req.body as Record<string, unknown>), 'Skill created', 201); } catch (err) { handle(err, res); }
});
router.put('/skills/:id', async (req: AuthRequest, res: Response) => {
  try { sendSuccess(res, await admin.updateSkill(req.user!.userId, req.params['id']!, req.body as Record<string, unknown>), 'Skill updated'); } catch (err) { handle(err, res); }
});
router.patch('/skills/:id/toggle', async (req: AuthRequest, res: Response) => {
  try { sendSuccess(res, await admin.toggleSkillActive(req.user!.userId, req.params['id']!), 'Skill toggled'); } catch (err) { handle(err, res); }
});

// ── Content moderation ───────────────────────────────────────────────────────
router.get('/jobs', async (req: AuthRequest, res: Response) => {
  try { sendSuccess(res, await admin.listJobs(req.query), 'Jobs'); } catch (err) { handle(err, res); }
});
router.patch('/jobs/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body as { status?: string };
    if (!status) { sendError(res, 'status is required.', 400, ApiErrorCode.VALIDATION_ERROR); return; }
    sendSuccess(res, await admin.setJobStatus(req.user!.userId, req.params['id']!, status), 'Job updated');
  } catch (err) { handle(err, res); }
});
router.get('/posts', async (req: AuthRequest, res: Response) => {
  try { sendSuccess(res, await admin.listPosts(req.query), 'Posts'); } catch (err) { handle(err, res); }
});
router.delete('/posts/:id', async (req: AuthRequest, res: Response) => {
  try { sendSuccess(res, await admin.deletePost(req.user!.userId, req.params['id']!), 'Post deleted'); } catch (err) { handle(err, res); }
});

export default router;
