// ─────────────────────────────────────────────────────────────────────────────
// messages.service.ts
// Complete direct-messaging service: threads, send, read, delete, requests.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Types } from 'mongoose';
import { Message }   from '../models/Message.model';
import type { IMessageDocument } from '../models/Message.model';
import { Thread, canonicalPair } from '../models/Thread.model';
import type { IThreadDocument } from '../models/Thread.model';
import { User }      from '../models/User.model';
import type { IUserDocument } from '../models/User.model';
import { Connection }from '../models/Connection.model';
import { AppError }  from '../middleware/error.middleware';
import { emitToUser, SOCKET_EVENTS } from '../socket/socket';
import logger        from '../utils/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Public output shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface IMessageOut {
  _id:           string;
  threadId:      string;
  senderId:      string;
  recipientId:   string;
  content:       string;
  attachments:   { url: string; type: string; name: string; sizeBytes: number }[];
  reactions:     { userId: string; emoji: string }[];
  readAt:        string | null;
  isDeleted:     boolean;
  isInMailMessage: boolean;
  createdAt:     string;
  updatedAt:     string;
}

export interface IParticipantMini {
  _id:          string;
  fullName:     string;
  firstName:    string;
  lastName:     string;
  headline:     string;
  profilePhoto: string;
  customUrl:    string;
  isOnline:     boolean;
}

export interface IThreadSummary {
  threadId:      string;
  participant:   IParticipantMini;
  lastMessage:   { content: string; createdAt: string; senderId: string } | null;
  unreadCount:   number;
  isRequest:     boolean;
  updatedAt:     string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function serializeMessage(doc: IMessageDocument): IMessageOut {
  return {
    _id:           doc._id.toString(),
    threadId:      doc.threadId.toString(),
    senderId:      doc.senderId.toString(),
    recipientId:   doc.recipientId.toString(),
    content:       doc.isDeleted ? '[Message deleted]' : doc.content,
    attachments:   (doc.attachments ?? []).map((a) => ({
      url: a.url, type: a.type, name: a.name, sizeBytes: a.sizeBytes,
    })),
    reactions:     (doc.reactions ?? []).map((r) => ({
      userId: r.userId.toString(), emoji: r.emoji,
    })),
    readAt:        doc.readAt?.toISOString() ?? null,
    isDeleted:     doc.isDeleted,
    isInMailMessage: doc.isInMailMessage,
    createdAt:     doc.createdAt.toISOString(),
    updatedAt:     doc.updatedAt.toISOString(),
  };
}

async function getUserMini(userId: string): Promise<IParticipantMini> {
  const u = await User.findById(userId).lean<IUserDocument>();
  if (!u) return { _id: userId, fullName: 'Unknown', firstName: '', lastName: '', headline: '', profilePhoto: '', customUrl: '', isOnline: false };
  return {
    _id:          u._id.toString(),
    fullName:     `${u.firstName} ${u.lastName}`,
    firstName:    u.firstName,
    lastName:     u.lastName,
    headline:     u.headline ?? '',
    profilePhoto: u.profilePhoto ?? '',
    customUrl:    u.customUrl ?? '',
    isOnline:     false, // real-time presence tracked via Socket.io
  };
}

/** Determines unread count for a given viewer in a thread */
function unreadFor(thread: IThreadDocument, viewerId: string): number {
  const isA = thread.participantA.toString() === viewerId;
  return isA ? thread.unreadCountA : thread.unreadCountB;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /messages/threads — list all threads for user
// ─────────────────────────────────────────────────────────────────────────────

export async function listThreads(
  userId: string,
  requestsOnly = false,
): Promise<IThreadSummary[]> {
  const oid = new Types.ObjectId(userId);

  const threads = await Thread.find({
    $or: [
      { participantA: oid, isDeletedA: false },
      { participantB: oid, isDeletedB: false },
    ],
    isRequest: requestsOnly,
  })
  .sort({ lastMessageAt: -1 })
  .limit(50)
  .lean<IThreadDocument[]>();

  const results: IThreadSummary[] = await Promise.all(
    threads.map(async (t) => {
      const isA       = t.participantA.toString() === userId;
      const partnerId = isA ? t.participantB.toString() : t.participantA.toString();
      const partner   = await getUserMini(partnerId);

      // Last message preview
      const lastMsg = await Message.findOne({ threadId: t._id })
        .sort({ createdAt: -1 })
        .lean<IMessageDocument>();

      return {
        threadId:    t._id.toString(),
        participant: partner,
        lastMessage: lastMsg
          ? {
              content:   lastMsg.isDeleted ? '[Message deleted]' : lastMsg.content.slice(0, 80),
              createdAt: lastMsg.createdAt.toISOString(),
              senderId:  lastMsg.senderId.toString(),
            }
          : null,
        unreadCount: unreadFor(t, userId),
        isRequest:   t.isRequest,
        updatedAt:   t.updatedAt.toISOString(),
      };
    }),
  );

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /messages/threads/:threadId — paginated messages + mark read
// ─────────────────────────────────────────────────────────────────────────────

export async function getThread(
  threadId: string,
  userId:   string,
  page = 1,
  limit = 50,
): Promise<{ messages: IMessageOut[]; participant: IParticipantMini; hasMore: boolean }> {
  if (!mongoose.Types.ObjectId.isValid(threadId)) throw new AppError('Invalid thread ID.', 400, true);

  const thread = await Thread.findById(threadId).lean<IThreadDocument>();
  if (!thread) throw new AppError('Thread not found.', 404, true);

  const ids  = [thread.participantA.toString(), thread.participantB.toString()];
  if (!ids.includes(userId)) throw new AppError('Forbidden.', 403, true);

  const partnerId = ids.find((id) => id !== userId)!;

  const skip  = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    Message.find({ threadId: new Types.ObjectId(threadId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<IMessageDocument[]>(),
    Message.countDocuments({ threadId: new Types.ObjectId(threadId) }),
  ]);

  // Mark unread messages as read
  const now = new Date();
  await Message.updateMany(
    {
      threadId:    new Types.ObjectId(threadId),
      recipientId: new Types.ObjectId(userId),
      readAt:      null,
    },
    { $set: { readAt: now } },
  );

  // Reset unread counter on thread
  const isA = thread.participantA.toString() === userId;
  await Thread.findByIdAndUpdate(threadId, {
    [isA ? 'unreadCountA' : 'unreadCountB']: 0,
  });

  // Emit read receipt to sender
  emitToUser(partnerId, SOCKET_EVENTS.READ_RECEIPT, { threadId, readAt: now.toISOString(), readerId: userId });

  const partner = await getUserMini(partnerId);

  return {
    messages:    docs.reverse().map(serializeMessage),
    participant: partner,
    hasMore:     skip + limit < total,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /messages/send
// ─────────────────────────────────────────────────────────────────────────────

export interface SendMessageInput {
  recipientId:  string;
  content:      string;
  attachments?: { url: string; type: string; name: string; sizeBytes: number }[];
}

export async function sendMessage(
  senderId: string,
  input:    SendMessageInput,
): Promise<IMessageOut> {
  const { recipientId, content, attachments = [] } = input;

  if (!content?.trim() && attachments.length === 0) {
    throw new AppError('Message cannot be empty.', 400, true);
  }
  if (content.length > 10000) throw new AppError('Message too long (max 10,000 chars).', 400, true);
  if (senderId === recipientId) throw new AppError('Cannot message yourself.', 400, true);

  // Block check
  const sender = await User.findById(senderId).select('blockedUsers connections').lean<IUserDocument>();
  const recip  = await User.findById(recipientId).select('blockedUsers').lean<IUserDocument>();
  if (!sender || !recip) throw new AppError('User not found.', 404, true);

  const senderBlocked = sender.blockedUsers?.some((id) => id.toString() === recipientId);
  const recipBlocked  = recip.blockedUsers?.some((id) => id.toString() === senderId);
  if (senderBlocked || recipBlocked) throw new AppError('Cannot send message.', 403, true);

  // Check connection status (determines isRequest)
  const conn = await Connection.findOne({
    $or: [
      { requesterId: senderId,    recipientId },
      { requesterId: recipientId, recipientId: senderId },
    ],
    status: 'accepted',
  }).lean();
  const isConnected = !!conn;

  // Find or create thread
  const [pA, pB] = canonicalPair(senderId, recipientId);
  let thread = await Thread.findOne({ participantA: pA, participantB: pB });
  if (!thread) {
    thread = await Thread.create({
      participantA: pA,
      participantB: pB,
      isRequest: !isConnected,
    });
  }

  const msg = await Message.create({
    threadId:    thread._id,
    senderId:    new Types.ObjectId(senderId),
    recipientId: new Types.ObjectId(recipientId),
    content:     content.trim(),
    attachments,
    isInMailMessage: !isConnected,
    isDeleted:   false,
    readAt:      null,
  });

  // Update thread metadata
  const isRecipA = thread.participantA.toString() === recipientId;
  await Thread.findByIdAndUpdate(thread._id, {
    lastMessageAt:      msg.createdAt,
    lastMessagePreview: content.slice(0, 80),
    $inc: { [isRecipA ? 'unreadCountA' : 'unreadCountB']: 1 },
  });

  const out = serializeMessage(msg as IMessageDocument);

  // Emit to recipient's room
  emitToUser(recipientId, SOCKET_EVENTS.NEW_MESSAGE, {
    threadId: thread._id.toString(),
    message:  out,
  });

  // Also emit a notification
  emitToUser(recipientId, SOCKET_EVENTS.NOTIFICATION, {
    type:    'message',
    payload: { senderId, threadId: thread._id.toString(), preview: content.slice(0, 60) },
  });

  logger.info(`[messages] Sent: ${senderId} → ${recipientId} threadId=${thread._id}`);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PUT /messages/threads/:threadId/read
// ─────────────────────────────────────────────────────────────────────────────

export async function markThreadRead(threadId: string, userId: string): Promise<void> {
  const thread = await Thread.findById(threadId).lean<IThreadDocument>();
  if (!thread) throw new AppError('Thread not found.', 404, true);

  const ids = [thread.participantA.toString(), thread.participantB.toString()];
  if (!ids.includes(userId)) throw new AppError('Forbidden.', 403, true);

  const now = new Date();
  await Message.updateMany(
    { threadId: new Types.ObjectId(threadId), recipientId: new Types.ObjectId(userId), readAt: null },
    { $set: { readAt: now } },
  );

  const isA = thread.participantA.toString() === userId;
  await Thread.findByIdAndUpdate(threadId, { [isA ? 'unreadCountA' : 'unreadCountB']: 0 });

  const partnerId = ids.find((id) => id !== userId)!;
  emitToUser(partnerId, SOCKET_EVENTS.READ_RECEIPT, { threadId, readAt: now.toISOString(), readerId: userId });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DELETE /messages/:messageId — soft delete
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteMessage(messageId: string, userId: string): Promise<IMessageOut> {
  const msg = await Message.findById(messageId);
  if (!msg) throw new AppError('Message not found.', 404, true);
  if (msg.senderId.toString() !== userId) throw new AppError('Forbidden — only sender can delete.', 403, true);

  msg.isDeleted = true;
  msg.content   = '[Message deleted]';
  await msg.save();

  return serializeMessage(msg as IMessageDocument);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. GET /messages/requests — message requests queue
// ─────────────────────────────────────────────────────────────────────────────

export async function listRequests(userId: string): Promise<IThreadSummary[]> {
  return listThreads(userId, true);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. POST /messages/requests/:requestId/accept
// ─────────────────────────────────────────────────────────────────────────────

export async function acceptRequest(threadId: string, userId: string): Promise<void> {
  const thread = await Thread.findById(threadId);
  if (!thread) throw new AppError('Thread not found.', 404, true);

  const ids = [thread.participantA.toString(), thread.participantB.toString()];
  if (!ids.includes(userId)) throw new AppError('Forbidden.', 403, true);

  thread.isRequest = false;
  await thread.save();
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. POST /messages/requests/:requestId/ignore — soft delete for viewer
// ─────────────────────────────────────────────────────────────────────────────

export async function ignoreRequest(threadId: string, userId: string): Promise<void> {
  const thread = await Thread.findById(threadId);
  if (!thread) throw new AppError('Thread not found.', 404, true);

  const isA = thread.participantA.toString() === userId;
  if (isA) thread.isDeletedA = true;
  else     thread.isDeletedB = true;
  await thread.save();
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. GET /messages/search — full-text search
// ─────────────────────────────────────────────────────────────────────────────

export async function searchMessages(
  userId: string,
  query:  string,
  limit = 20,
): Promise<IMessageOut[]> {
  if (!query?.trim()) return [];

  const docs = await Message.find({
    $or: [
      { senderId:    new Types.ObjectId(userId) },
      { recipientId: new Types.ObjectId(userId) },
    ],
    isDeleted: false,
    $text: { $search: query },
  })
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit)
  .lean<IMessageDocument[]>();

  return docs.map(serializeMessage);
}
