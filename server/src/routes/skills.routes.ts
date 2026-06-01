import { Router, type Response } from 'express';
import { Skill } from '../models/Skill.model';
import { sendSuccess, sendError } from '../utils/response';
import { ApiErrorCode } from '@SkillSeal/shared';

const router = Router();

// GET /api/v1/skills — public, returns all active skills
router.get('/', async (_req, res: Response) => {
  try {
    const skills = await Skill.find({ isActive: true })
      .select('_id name slug category icon availableTiers description')
      .sort({ name: 1 })
      .lean();
    sendSuccess(res, skills);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    sendError(res, `Failed to fetch skills: ${msg}`, 500, ApiErrorCode.INTERNAL_ERROR);
  }
});

export default router;
