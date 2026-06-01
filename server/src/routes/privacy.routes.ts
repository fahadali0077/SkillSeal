import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { authenticate, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { ApiErrorCode } from '@SkillSeal/shared';
import { User } from '../models/User.model';
import type { IUserDocument } from '../models/User.model';
import { Post } from '../models/Post.model';
import { Message } from '../models/Message.model';
import { Thread } from '../models/Thread.model';
import { Notification } from '../models/Notification.model';
import { Verification } from '../models/Verification.model';
import { Application } from '../models/Application.model';
import { Connection } from '../models/Connection.model';
import { clearActiveSession } from '../utils/redis';
import logger from '../utils/logger';
const router = Router();
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const targetId = req.params['id']!, actorId = req.user!.userId;
  if (targetId !== actorId) { sendError(res, 'Forbidden.', 403, ApiErrorCode.FORBIDDEN); return; }
  try {
    const oid = new Types.ObjectId(targetId);
    const scheduledAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

    // HIGH-18: cascade-delete user-owned data immediately at request time.
    // The User document itself is preserved (with scheduledDeletionAt set) so
    // active sessions and outstanding refresh tokens become invalid via
    // tokenVersion bump, but a daily cron permanently removes the User
    // after the 30-day grace period.
    await Promise.all([
      Post.updateMany({ authorId: oid }, { $set: { isDeleted: true } }),
      User.updateMany({ connections: oid }, { $pull: { connections: oid } }),
      Connection.deleteMany({ $or: [{ requesterId: oid }, { recipientId: oid }] }),
      Verification.updateMany({ userId: oid }, { $unset: { userId: 1 } }),
      Message.deleteMany({ senderId: oid }),
      Thread.deleteMany({ $or: [{ participantA: oid }, { participantB: oid }] }),
      Notification.deleteMany({ recipientId: oid }),
      Application.deleteMany({ candidateId: oid }),
      clearActiveSession(targetId),
    ]);

    // Schedule the permanent User deletion for 30 days from now.
    await User.findByIdAndUpdate(targetId, { $inc: { tokenVersion: 1 }, $set: { scheduledDeletionAt: scheduledAt } });
    res.clearCookie('SkillSeal_refresh_token', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    logger.info(`[privacy] Account deletion scheduled: userId=${targetId} permanentlyAt=${scheduledAt.toISOString()}`);
    sendSuccess(res, { scheduledDeletionAt: scheduledAt.toISOString() }, 'Account deletion scheduled for 30 days from now.');
  } catch (err) { sendError(res, 'Failed.', 500, ApiErrorCode.INTERNAL_ERROR); }
});
router.get('/:id/export', authenticate, async (req: AuthRequest, res: Response) => {
  const targetId = req.params['id']!, actorId = req.user!.userId;
  if (targetId !== actorId) { sendError(res, 'Forbidden.', 403, ApiErrorCode.FORBIDDEN); return; }
  try {
    const oid = new Types.ObjectId(targetId);
    const [user, verifications, applications, sentMessages, userThreads, connections] = await Promise.all([User.findById(oid).select('-passwordHash -tokenVersion').lean<IUserDocument>(), Verification.find({ userId: oid }).lean(), Application.find({ candidateId: oid }).lean(), Message.find({ senderId: oid }).select('content createdAt threadId').lean(), Thread.find({ $or: [{ participantA: oid }, { participantB: oid }] }).select('_id participantA participantB').lean(), Connection.find({ $or: [{ requesterId: oid }, { recipientId: oid }], status: 'accepted' }).lean()]);
    if (!user) { sendError(res, 'Not found.', 404, ApiErrorCode.NOT_FOUND); return; }
    // Received messages: messages in user's threads sent by others (no recipientId stored)
    const threadIds = userThreads.map((t: { _id: Types.ObjectId }) => t._id);
    const receivedMessages = await Message.find({ threadId: { $in: threadIds }, senderId: { $ne: oid } }).select('content createdAt senderId').lean();
    // Derive recipient for sent messages from thread participants
    const threadMap = new Map(userThreads.map((t: { _id: Types.ObjectId; participantA: Types.ObjectId; participantB: Types.ObjectId }) => [t._id.toString(), t]));
    const data = { exportedAt: new Date().toISOString(), exportVersion: '1.0', profile: { _id: user._id.toString(), firstName: user.firstName, lastName: user.lastName, email: user.email, headline: user.headline, location: user.location }, experience: user.experience, education: user.education, skills: user.skills, verifications: verifications.map((v: { skillId?: Types.ObjectId; tier: string; compositeScore: number; issuedAt: Date; expiresAt: Date; status: string; certificateId: string }) => ({ skillId: v.skillId?.toString(), tier: v.tier, compositeScore: v.compositeScore, issuedAt: v.issuedAt, expiresAt: v.expiresAt, status: v.status, certificateId: v.certificateId })), applications: applications.map((a: { jobId?: Types.ObjectId; status: string; appliedAt: Date }) => ({ jobId: a.jobId?.toString(), status: a.status, appliedAt: a.appliedAt })), messages: { sent: sentMessages.map((m: { threadId: Types.ObjectId; content: string; createdAt: Date }) => { const t = threadMap.get(m.threadId.toString()) as { participantA: Types.ObjectId; participantB: Types.ObjectId } | undefined; const to = t ? (t.participantA.toString() === oid.toString() ? t.participantB : t.participantA).toString() : 'unknown'; return { to, content: m.content, sentAt: m.createdAt }; }), received: receivedMessages.map((m: { senderId: Types.ObjectId; content: string; createdAt: Date }) => ({ from: m.senderId?.toString(), content: m.content, receivedAt: m.createdAt })) } };
    const fn = `SkillSeal-data-export-${targetId}-${Date.now()}.json`;
    res.setHeader('Content-Type', 'application/json').setHeader('Content-Disposition', `attachment; filename="${fn}"`).send(JSON.stringify(data, null, 2));
  } catch (err) { sendError(res, 'Export failed.', 500, ApiErrorCode.INTERNAL_ERROR); }
});
export default router;
