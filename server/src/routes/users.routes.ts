// ─────────────────────────────────────────────────────────────────────────────
// users.routes.ts  –  /api/v1/users
// ─────────────────────────────────────────────────────────────────────────────
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { ApiErrorCode } from '@SkillSeal/shared';
import type { IExperience, IEducation } from '@SkillSeal/shared';
import { authenticate, optionalAuth, requireRole, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import {
  getProfile, updateProfile, searchUsers, getCompleteness,
  addExperience, updateExperience, deleteExperience,
  addEducation, updateEducation, deleteEducation,
  addSkill, removeSkill, uploadProfilePhoto,
} from '../services/users.service';
import { getConnectionDegree, followUser, unfollowUser } from '../services/connections.service';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function handleError(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    let code = ApiErrorCode.INTERNAL_ERROR;
    const msg = err.message.toLowerCase();
    if (msg.includes('not found')) code = ApiErrorCode.NOT_FOUND;
    if (msg.includes('already')) code = ApiErrorCode.ALREADY_EXISTS;
    if (msg.includes('cannot be removed')) code = ApiErrorCode.CONFLICT;
    if (msg.includes('custom url')) code = ApiErrorCode.CUSTOM_URL_TAKEN;
    if (msg.includes('invalid')) code = ApiErrorCode.VALIDATION_ERROR;
    sendError(res, err.message, err.statusCode, code);
  } else {
    sendError(res, 'Unexpected error', 500, ApiErrorCode.INTERNAL_ERROR);
  }
}

// ── GET /users/search  (must be before /:id) ──────────────────────────────────
router.get('/search', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { skill, tier, location, page, limit } = req.query as Record<string, string>;
    const verifiedOnly = req.query['verifiedOnly'] === 'true';
    const openToWork = req.query['openToWork'] === 'true';
    const result = await searchUsers({
      skill, tier, location, verifiedOnly, openToWork,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    sendSuccess(res, result, 'Search results');
  } catch (err) { handleError(err, res); }
});

// ── GET /users/me — authenticated user's own profile (MUST be before /:id) ──
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await getProfile(req.user!.userId, req.user!.userId);
    sendSuccess(res, profile, 'Profile retrieved');
  } catch (err) { handleError(err, res); }
});

// ── GET /users/:id ────────────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await getProfile(req.params['id']!, req.user?.userId);
    sendSuccess(res, profile, 'Profile retrieved');
  } catch (err) { handleError(err, res); }
});

// ── PUT /users/:id ────────────────────────────────────────────────────────────
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.userId !== req.params['id']) {
      sendError(res, 'Forbidden', 403, ApiErrorCode.FORBIDDEN); return;
    }
    const updated = await updateProfile(req.user!.userId, req.body as object);
    sendSuccess(res, updated, 'Profile updated');
  } catch (err) { handleError(err, res); }
});

// ── Experience CRUD ───────────────────────────────────────────────────────────
router.post('/:id/experience', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.userId !== req.params['id']) { sendError(res, 'Forbidden', 403, ApiErrorCode.FORBIDDEN); return; }
    const updated = await addExperience(req.user!.userId, req.body as Omit<IExperience, '_id'>);
    sendSuccess(res, updated, 'Experience added', 201);
  } catch (err) { handleError(err, res); }
});

router.put('/:id/experience/:expId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.userId !== req.params['id']) { sendError(res, 'Forbidden', 403, ApiErrorCode.FORBIDDEN); return; }
    const updated = await updateExperience(req.user!.userId, req.params['expId']!, req.body as object);
    sendSuccess(res, updated, 'Experience updated');
  } catch (err) { handleError(err, res); }
});

router.delete('/:id/experience/:expId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.userId !== req.params['id']) { sendError(res, 'Forbidden', 403, ApiErrorCode.FORBIDDEN); return; }
    const updated = await deleteExperience(req.user!.userId, req.params['expId']!);
    sendSuccess(res, updated, 'Experience removed');
  } catch (err) { handleError(err, res); }
});

// ── Education CRUD ────────────────────────────────────────────────────────────
router.post('/:id/education', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.userId !== req.params['id']) { sendError(res, 'Forbidden', 403, ApiErrorCode.FORBIDDEN); return; }
    const updated = await addEducation(req.user!.userId, req.body as Omit<IEducation, '_id'>);
    sendSuccess(res, updated, 'Education added', 201);
  } catch (err) { handleError(err, res); }
});

router.put('/:id/education/:eduId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.userId !== req.params['id']) { sendError(res, 'Forbidden', 403, ApiErrorCode.FORBIDDEN); return; }
    const updated = await updateEducation(req.user!.userId, req.params['eduId']!, req.body as object);
    sendSuccess(res, updated, 'Education updated');
  } catch (err) { handleError(err, res); }
});

router.delete('/:id/education/:eduId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.userId !== req.params['id']) { sendError(res, 'Forbidden', 403, ApiErrorCode.FORBIDDEN); return; }
    const updated = await deleteEducation(req.user!.userId, req.params['eduId']!);
    sendSuccess(res, updated, 'Education removed');
  } catch (err) { handleError(err, res); }
});

// ── Skills ────────────────────────────────────────────────────────────────────
router.post('/:id/skills', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.userId !== req.params['id']) { sendError(res, 'Forbidden', 403, ApiErrorCode.FORBIDDEN); return; }
    const { skillId } = req.body as { skillId: string };
    if (!skillId) { sendError(res, 'skillId required', 400, ApiErrorCode.MISSING_REQUIRED_FIELD); return; }
    const updated = await addSkill(req.user!.userId, skillId);
    sendSuccess(res, updated, 'Skill added', 201);
  } catch (err) { handleError(err, res); }
});

router.delete('/:id/skills/:skillId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.userId !== req.params['id']) { sendError(res, 'Forbidden', 403, ApiErrorCode.FORBIDDEN); return; }
    const updated = await removeSkill(req.user!.userId, req.params['skillId']!);
    sendSuccess(res, updated, 'Skill removed');
  } catch (err) { handleError(err, res); }
});

// ── Profile photo ─────────────────────────────────────────────────────────────
router.post(
  '/:id/profile-photo',
  authenticate,
  upload.single('photo'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.userId !== req.params['id']) { sendError(res, 'Forbidden', 403, ApiErrorCode.FORBIDDEN); return; }
      if (!req.file) { sendError(res, 'No file uploaded', 400, ApiErrorCode.MISSING_REQUIRED_FIELD); return; }
      const result = await uploadProfilePhoto(req.user!.userId, req.file.buffer, req.file.mimetype);
      sendSuccess(res, result, 'Profile photo updated');
    } catch (err) { handleError(err, res); }
  },
);

// ── Profile completeness ──────────────────────────────────────────────────────
// ── GET /users/:id/connection-degree ──────────────────────────────────────
router.get('/:id/connection-degree', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const degree = await getConnectionDegree(req.user!.userId, req.params['id']!);
    sendSuccess(res, { degree }, 'Degree resolved');
  } catch (err) { handleError(err, res); }
});

router.get('/:id/completeness', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.userId !== req.params['id']) { sendError(res, 'Forbidden', 403, ApiErrorCode.FORBIDDEN); return; }
    const result = await getCompleteness(req.user!.userId);
    sendSuccess(res, result, 'Completeness score');
  } catch (err) { handleError(err, res); }
});

// ── Follow / Unfollow ─────────────────────────────────────────────────────────
// Client calls POST/DELETE /api/v1/users/:id/follow
router.post('/:id/follow', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await followUser(req.user!.userId, req.params['id']!);
    sendSuccess(res, null, 'Now following');
  } catch (err) { handleError(err, res); }
});

router.delete('/:id/follow', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await unfollowUser(req.user!.userId, req.params['id']!);
    sendSuccess(res, null, 'Unfollowed');
  } catch (err) { handleError(err, res); }
});

export default router;