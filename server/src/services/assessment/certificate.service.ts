import crypto from 'crypto';
import { Types } from 'mongoose';
import { Verification } from '../../models/Verification.model';
import { User } from '../../models/User.model';
import { Session } from '../../models/Session.model';
import { Skill } from '../../models/Skill.model';
import { Post } from '../../models/Post.model';
import { env } from '../../config/env';
import { computeCompositeScore } from './scoring.service';
import { deleteSession } from '../../utils/redis';
import { notify } from '../notifications.service';
import logger from '../../utils/logger';

export function verifyCertificateHash(sessionId: string, score: number, issuedAt: Date, hash: string): boolean {
  if (!hash) return false;
  const expected = crypto.createHash('sha256').update(`${sessionId}:${score}:${issuedAt.toISOString()}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(hash.padEnd(64, '0').slice(0, 64), 'hex'));
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

export async function issueCertificate(sessionId: string): Promise<{ status: string; verification?: unknown; retakeAfterDays?: number }> {
  const session = await Session.findById(sessionId).lean();
  if (!session) throw new Error('Session not found');

  const { scores, finalTier, retakeAfterDays } = await computeCompositeScore(sessionId);
  const { compositeScore, aiProbability } = scores;

  if (compositeScore < 50) return { status: 'not_certified', retakeAfterDays: 14 };
  if (compositeScore < 70) return { status: 'partial', retakeAfterDays: 7 };

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + 365 * 86400000);
  const year = issuedAt.getFullYear();
  const day = String(dayOfYear(issuedAt)).padStart(3, '0');
  const hex = crypto.randomBytes(2).toString('hex').toUpperCase();
  const certificateId = `SkillSeal-${hex}-${year}-${day}`;
  const certHash = crypto.createHash('sha256').update(`${sessionId}:${compositeScore}:${issuedAt.toISOString()}`).digest('hex');
  const certStatus = aiProbability > 0.5 ? 'FLAGGED' : 'VERIFIED';

  const verif = await Verification.create({
    userId: session.userId, skillId: session.skillId, sessionId: new Types.ObjectId(sessionId),
    tier: finalTier || session.declaredTier,
    compositeScore, conceptScore: scores.conceptScore, speedScore: scores.speedScore,
    consistencyScore: scores.consistencyScore, behaviorScore: scores.behaviorScore,
    aiScore: scores.aiScore, aiProbability,
    certificateId, certificateHash: certHash, issuedAt, expiresAt, status: certStatus,
  });

  await User.findByIdAndUpdate(session.userId, {
    $set: { 'skills.$[el].status': 'verified', 'skills.$[el].verificationId': verif._id },
    $push: {
      verifiedSkillsSummary: {
        skillId: session.skillId, skillName: '', skillSlug: '',
        tier: finalTier || session.declaredTier, compositeScore, issuedAt,
      }
    },
  }, { arrayFilters: [{ 'el.skillId': session.skillId }] });

  await Session.findByIdAndUpdate(sessionId, {
    status: 'completed', verificationId: verif._id, endTime: new Date(),
    compositeScore, conceptScore: scores.conceptScore, speedScore: scores.speedScore,
    consistencyScore: scores.consistencyScore, behaviorScore: scores.behaviorScore,
    aiScore: scores.aiScore, aiProbability, finalTier: finalTier || session.declaredTier,
  });

  await deleteSession(sessionId);

  const skill = await Skill.findById(session.skillId).lean<{ name: string; slug: string }>();
  const user = await User.findById(session.userId).lean<{ firstName: string; lastName: string }>();

  // Feed post
  try {
    await Post.create({
      authorId: session.userId, content: `${user?.firstName} just earned a Verified ${finalTier || session.declaredTier} ${skill?.name} badge.`,
      type: 'verification_announcement', isVerificationAnnouncement: true, verificationId: verif._id,
    });
  } catch (err) { logger.error('[cert] Feed post error:', err); }

  // Notification
  void notify.certificateIssued(session.userId.toString(), {
    _id: verif._id.toString(), skillName: skill?.name ?? '', tier: finalTier || session.declaredTier, compositeScore,
    issuedAt: issuedAt.toISOString(), expiresAt: expiresAt.toISOString(),
  }).catch(() => { });

  logger.info(`[cert] Issued: userId=${session.userId} score=${compositeScore} certId=${certificateId}`);
  return { status: 'verified', verification: verif };
}
