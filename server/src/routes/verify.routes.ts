import { Router, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { ApiErrorCode } from '@SkillSeal/shared';
import { Verification } from '../models/Verification.model';
import type { IVerificationDocument } from '../models/Verification.model';
import { Session } from '../models/Session.model';
import { User } from '../models/User.model';
import type { IUserDocument } from '../models/User.model';
import { Skill } from '../models/Skill.model';
import type { ISkillDocument } from '../models/Skill.model';
import { verifyCertificateHash } from '../services/assessment/certificate.service';
import { sendSuccess, sendError } from '../utils/response';
import { isValidObjectId } from 'mongoose';
const router = Router();
const verifyLimiter = rateLimit({ windowMs: 60000, max: 20, keyGenerator: (req: Request) => (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? 'unknown' });
router.get('/:verificationId', verifyLimiter, async (req: Request, res: Response) => {
  const { verificationId } = req.params as { verificationId: string };
  if (!isValidObjectId(verificationId)) {
    sendError(res, 'Certificate not found.', 404, ApiErrorCode.CERTIFICATE_NOT_FOUND); return;
  }
  try {
    const v = await Verification.findById(verificationId).lean<IVerificationDocument>();
    if (!v) { sendError(res, 'Certificate not found.', 404, ApiErrorCode.CERTIFICATE_NOT_FOUND); return; }
    const session = await Session.findById(v.sessionId).select('_id').lean<{ _id: unknown }>();
    if (!session) { sendError(res, 'Integrity check failed.', 400, ApiErrorCode.CERTIFICATE_NOT_FOUND); return; }
    const valid = verifyCertificateHash(String(session._id), v.compositeScore, v.issuedAt, v.certificateHash);
    if (!valid) { sendError(res, 'Integrity check failed.', 400, ApiErrorCode.CERTIFICATE_NOT_FOUND); return; }
    const [user, skill] = await Promise.all([User.findById(v.userId).select('firstName lastName').lean<Pick<IUserDocument, '_id' | 'firstName' | 'lastName'>>(), Skill.findById(v.skillId).select('name slug').lean<Pick<ISkillDocument, '_id' | 'name' | 'slug'>>()]);
    sendSuccess(res, { certificateId: v.certificateId, name: user ? `${user.firstName} ${user.lastName}` : 'SkillSeal Member', skill: skill?.name ?? '', skillSlug: skill?.slug ?? '', tier: v.tier, status: v.status, issuedAt: v.issuedAt, expiresAt: v.expiresAt, isExpired: new Date(v.expiresAt) < new Date() }, 'Certificate verified');
  } catch (err) { sendError(res, 'Lookup failed.', 500, ApiErrorCode.INTERNAL_ERROR); }
});
export default router;
