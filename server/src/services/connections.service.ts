// ─────────────────────────────────────────────────────────────────────────────
// connections.service.ts
// Complete connection system: request, accept, decline, remove, block,
// follow/unfollow, listing, and connection-degree resolution.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Types } from 'mongoose';
import { User }            from '../models/User.model';
import type { IUserDocument } from '../models/User.model';
import { Connection }      from '../models/Connection.model';
import type { IConnectionDocument } from '../models/Connection.model';
import { AppError }        from '../middleware/error.middleware';
import { getRedis }        from '../config/redis';
import { getIO, SOCKET_EVENTS } from '../config/socket';
import logger              from '../utils/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const WEEKLY_LIMIT   = 100;
const PENDING_LIMIT  = 200;
const NOTE_MAX       = 300;

function weeklyKey(userId: string)  { return `conn:weekly:${userId}`; }
function suggestKey(userId: string) { return `suggestions:${userId}`; }

async function assertNotSelf(a: string, b: string) {
  if (a === b) throw new AppError('You cannot connect with yourself.', 400, true);
}

async function assertNotBlocked(senderId: string, recipientId: string) {
  const [sender, recipient] = await Promise.all([
    User.findById(senderId).lean<IUserDocument>(),
    User.findById(recipientId).lean<IUserDocument>(),
  ]);
  if (!sender || !recipient) throw new AppError('User not found.', 404, true);

  const senderBlocked    = sender.blockedUsers?.some((id) => id.toString() === recipientId);
  const recipientBlocked = recipient.blockedUsers?.some((id) => id.toString() === senderId);
  if (senderBlocked || recipientBlocked) {
    throw new AppError('Connection request cannot be sent.', 403, true);
  }
}

/** Emit a real-time notification to a user's socket room */
function emitNotification(userId: string, payload: Record<string, unknown>) {
  try {
    getIO().to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION, payload);
  } catch {
    // Socket not yet initialised during tests – silently ignore
  }
}

/** Bust PYMK cache for both users when a relationship changes */
async function bustSuggestions(...userIds: string[]) {
  const redis = getRedis();
  await Promise.all(userIds.map((id) => redis.del(suggestKey(id))));
}

// ─────────────────────────────────────────────────────────────────────────────
// Public profile mini-shape for list responses
// ─────────────────────────────────────────────────────────────────────────────

interface UserMini {
  _id:          string;
  fullName:     string;
  firstName:    string;
  lastName:     string;
  headline:     string;
  profilePhoto: string;
  customUrl:    string;
  connectionCount: number;
}

async function toMini(doc: IUserDocument): Promise<UserMini> {
  return {
    _id:             doc._id.toString(),
    fullName:        `${doc.firstName} ${doc.lastName}`,
    firstName:       doc.firstName,
    lastName:        doc.lastName,
    headline:        doc.headline ?? '',
    profilePhoto:    doc.profilePhoto ?? '',
    customUrl:       doc.customUrl ?? '',
    connectionCount: doc.connections?.length ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Send connection request
// ─────────────────────────────────────────────────────────────────────────────

export async function sendRequest(
  senderId: string,
  recipientId: string,
  note?: string,
): Promise<IConnectionDocument> {
  await assertNotSelf(senderId, recipientId);
  await assertNotBlocked(senderId, recipientId);

  if (!mongoose.Types.ObjectId.isValid(recipientId)) {
    throw new AppError('Invalid recipient ID.', 400, true);
  }

  // Already connected or pending?
  const existing = await Connection.findOne({
    $or: [
      { requesterId: senderId,    recipientId },
      { requesterId: recipientId, recipientId: senderId },
    ],
    status: { $in: ['pending', 'accepted'] },
  });
  if (existing) {
    throw new AppError(
      existing.status === 'accepted'
        ? 'You are already connected with this user.'
        : 'A pending request already exists.',
      409,
      true,
    );
  }

  const redis = getRedis();

  // Pending outgoing limit (200)
  const pendingCount = await Connection.countDocuments({
    requesterId: senderId,
    status: 'pending',
  });
  if (pendingCount >= PENDING_LIMIT) {
    throw new AppError(
      'You have reached the maximum number of pending connection requests (200).',
      429,
      true,
    );
  }

  // Weekly send limit (100, stored in Redis with Sunday-midnight TTL)
  const wKey        = weeklyKey(senderId);
  const weeklyCount = parseInt((await redis.get(wKey)) ?? '0', 10);
  if (weeklyCount >= WEEKLY_LIMIT) {
    throw new AppError('Weekly connection request limit reached. Try again next week.', 429, true);
  }

  const conn = await Connection.create({
    requesterId: new Types.ObjectId(senderId),
    recipientId: new Types.ObjectId(recipientId),
    status: 'pending',
    note:   note ? note.slice(0, NOTE_MAX) : '',
  });

  // Increment weekly counter; set TTL to next Sunday midnight if not set
  const pipe = redis.multi();
  pipe.incr(wKey);
  pipe.expireat(wKey, nextSundayMidnightUnix());
  await pipe.exec();

  emitNotification(recipientId, {
    type:      'connection_request',
    senderId,
    connectionId: conn._id.toString(),
    message:   'sent you a connection request',
  });

  logger.info(`[connections] Request sent: ${senderId} → ${recipientId}`);
  return conn;
}

function nextSundayMidnightUnix(): number {
  const d   = new Date();
  const day = d.getUTCDay(); // 0 = Sunday
  d.setUTCDate(d.getUTCDate() + ((7 - day) % 7 || 7));
  d.setUTCHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Accept request
// ─────────────────────────────────────────────────────────────────────────────

export async function acceptRequest(connectionId: string, recipientId: string): Promise<void> {
  const conn = await Connection.findById(connectionId);
  if (!conn) throw new AppError('Connection request not found.', 404, true);
  if (conn.recipientId.toString() !== recipientId) throw new AppError('Forbidden.', 403, true);
  if (conn.status !== 'pending') throw new AppError('Request is no longer pending.', 409, true);

  conn.status      = 'accepted';
  conn.respondedAt = new Date();
  await conn.save();

  const rid = conn.requesterId.toString();
  const uid = conn.recipientId.toString();

  // Mutual array update
  await Promise.all([
    User.findByIdAndUpdate(rid, { $addToSet: { connections: new Types.ObjectId(uid) } }),
    User.findByIdAndUpdate(uid, { $addToSet: { connections: new Types.ObjectId(rid) } }),
  ]);

  emitNotification(rid, {
    type:         'connection_accepted',
    senderId:     uid,
    connectionId,
    message:      'accepted your connection request',
  });

  await bustSuggestions(rid, uid);
  logger.info(`[connections] Accepted: ${rid} ↔ ${uid}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Decline request
// ─────────────────────────────────────────────────────────────────────────────

export async function declineRequest(connectionId: string, recipientId: string): Promise<void> {
  const conn = await Connection.findById(connectionId);
  if (!conn) throw new AppError('Connection request not found.', 404, true);
  if (conn.recipientId.toString() !== recipientId) throw new AppError('Forbidden.', 403, true);
  if (conn.status !== 'pending') throw new AppError('Request is no longer pending.', 409, true);

  conn.status      = 'declined';
  conn.respondedAt = new Date();
  await conn.save();

  logger.info(`[connections] Declined: ${connectionId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Remove / withdraw connection
// ─────────────────────────────────────────────────────────────────────────────

export async function removeConnection(connectionId: string, actorId: string): Promise<void> {
  const conn = await Connection.findById(connectionId);
  if (!conn) throw new AppError('Connection not found.', 404, true);

  const rid = conn.requesterId.toString();
  const uid = conn.recipientId.toString();

  if (actorId !== rid && actorId !== uid) throw new AppError('Forbidden.', 403, true);

  if (conn.status === 'pending') {
    conn.status = actorId === rid ? 'withdrawn' : 'declined';
    await conn.save();
  } else if (conn.status === 'accepted') {
    // Remove from both connections[] arrays and delete record
    await Promise.all([
      User.findByIdAndUpdate(rid, { $pull: { connections: new Types.ObjectId(uid) } }),
      User.findByIdAndUpdate(uid, { $pull: { connections: new Types.ObjectId(rid) } }),
      Connection.findByIdAndDelete(connectionId),
    ]);
    await bustSuggestions(rid, uid);
  } else {
    throw new AppError('Connection cannot be removed in its current state.', 409, true);
  }

  logger.info(`[connections] Removed: ${connectionId} by actor=${actorId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Block user
// ─────────────────────────────────────────────────────────────────────────────

export async function blockUser(blockerId: string, targetId: string): Promise<void> {
  await assertNotSelf(blockerId, targetId);

  // Add to blockedUsers
  await User.findByIdAndUpdate(blockerId, {
    $addToSet: { blockedUsers: new Types.ObjectId(targetId) },
  });

  // Remove any existing connection silently
  const existing = await Connection.findOne({
    $or: [
      { requesterId: blockerId, recipientId: targetId },
      { requesterId: targetId, recipientId: blockerId },
    ],
    status: 'accepted',
  });

  if (existing) {
    await Promise.all([
      User.findByIdAndUpdate(blockerId, { $pull: { connections: new Types.ObjectId(targetId) } }),
      User.findByIdAndUpdate(targetId,  { $pull: { connections: new Types.ObjectId(blockerId) } }),
      Connection.findByIdAndDelete(existing._id),
    ]);
  } else {
    // Remove pending request too
    await Connection.deleteMany({
      $or: [
        { requesterId: blockerId, recipientId: targetId },
        { requesterId: targetId, recipientId: blockerId },
      ],
      status: { $in: ['pending'] },
    });
  }

  await bustSuggestions(blockerId, targetId);
  logger.info(`[connections] Blocked: ${blockerId} → ${targetId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Unblock user
// ─────────────────────────────────────────────────────────────────────────────

export async function unblockUser(blockerId: string, targetId: string): Promise<void> {
  await User.findByIdAndUpdate(blockerId, {
    $pull: { blockedUsers: new Types.ObjectId(targetId) },
  });
  logger.info(`[connections] Unblocked: ${blockerId} → ${targetId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7 & 8. Follow / Unfollow
// ─────────────────────────────────────────────────────────────────────────────

export async function followUser(followerId: string, targetId: string): Promise<void> {
  await assertNotSelf(followerId, targetId);
  await Promise.all([
    User.findByIdAndUpdate(followerId, { $addToSet: { following: new Types.ObjectId(targetId) } }),
    User.findByIdAndUpdate(targetId,  { $addToSet: { followers: new Types.ObjectId(followerId) } }),
  ]);
}

export async function unfollowUser(followerId: string, targetId: string): Promise<void> {
  await Promise.all([
    User.findByIdAndUpdate(followerId, { $pull: { following: new Types.ObjectId(targetId) } }),
    User.findByIdAndUpdate(targetId,  { $pull: { followers: new Types.ObjectId(followerId) } }),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. List connections
// ─────────────────────────────────────────────────────────────────────────────

export async function listConnections(
  userId: string,
  search?: string,
  page = 1,
  limit = 20,
): Promise<{ connections: UserMini[]; total: number }> {
  const user = await User.findById(userId).lean<IUserDocument>();
  if (!user) throw new AppError('User not found.', 404, true);

  const ids = user.connections ?? [];
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { _id: { $in: ids } };
  if (search) {
    filter['$or'] = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName:  { $regex: search, $options: 'i' } },
      { headline:  { $regex: search, $options: 'i' } },
    ];
  }

  const [docs, total] = await Promise.all([
    User.find(filter).skip(skip).limit(limit).lean<IUserDocument[]>(),
    User.countDocuments(filter),
  ]);

  return { connections: await Promise.all(docs.map(toMini)), total };
}

// ─────────────────────────────────────────────────────────────────────────────
// 10 & 11. Pending / Sent requests
// ─────────────────────────────────────────────────────────────────────────────

interface ConnRequestItem {
  connectionId: string;
  user:         UserMini;
  note:         string;
  createdAt:    string;
}

export async function getPendingRequests(userId: string): Promise<ConnRequestItem[]> {
  const conns = await Connection.find({ recipientId: userId, status: 'pending' })
    .sort({ createdAt: -1 }).limit(50).lean<IConnectionDocument[]>();

  const ids  = conns.map((c) => c.requesterId);
  const users = await User.find({ _id: { $in: ids } }).lean<IUserDocument[]>();
  const uMap  = new Map(users.map((u) => [u._id.toString(), u]));

  return conns.map((c) => ({
    connectionId: c._id.toString(),
    user:         buildMini(uMap.get(c.requesterId.toString())),
    note:         c.note,
    createdAt:    c.createdAt.toISOString(),
  }));
}

export async function getSentRequests(userId: string): Promise<ConnRequestItem[]> {
  const conns = await Connection.find({ requesterId: userId, status: 'pending' })
    .sort({ createdAt: -1 }).limit(50).lean<IConnectionDocument[]>();

  const ids   = conns.map((c) => c.recipientId);
  const users  = await User.find({ _id: { $in: ids } }).lean<IUserDocument[]>();
  const uMap   = new Map(users.map((u) => [u._id.toString(), u]));

  return conns.map((c) => ({
    connectionId: c._id.toString(),
    user:         buildMini(uMap.get(c.recipientId.toString())),
    note:         c.note,
    createdAt:    c.createdAt.toISOString(),
  }));
}

function buildMini(u?: IUserDocument): UserMini {
  if (!u) return { _id: '', fullName: 'Unknown', firstName: '', lastName: '', headline: '', profilePhoto: '', customUrl: '', connectionCount: 0 };
  return { _id: u._id.toString(), fullName: `${u.firstName} ${u.lastName}`, firstName: u.firstName, lastName: u.lastName, headline: u.headline ?? '', profilePhoto: u.profilePhoto ?? '', customUrl: u.customUrl ?? '', connectionCount: u.connections?.length ?? 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Connection degree resolution
// ─────────────────────────────────────────────────────────────────────────────

export type ConnectionDegree = '1st' | '2nd' | '3rd' | 'none';

/**
 * Returns the connection degree between viewer and target.
 * Uses MongoDB aggregation to traverse the connections graph up to 3 hops.
 */
export async function getConnectionDegree(
  viewerId: string,
  targetId: string,
): Promise<ConnectionDegree> {
  if (viewerId === targetId) return '1st'; // self

  const viewer = await User.findById(viewerId).select('connections').lean<{ connections: Types.ObjectId[] }>();
  if (!viewer) return 'none';

  const firstDegreeIds = viewer.connections.map((id) => id.toString());

  // 1st degree: direct connection
  if (firstDegreeIds.includes(targetId)) return '1st';

  if (firstDegreeIds.length === 0) return 'none';

  // 2nd degree: connection of a connection
  const secondDegreeResult = await User.aggregate<{ allSecond: string[] }>([
    { $match: { _id: { $in: viewer.connections } } },
    { $project: { connections: 1 } },
    { $unwind: '$connections' },
    { $group: { _id: null, allSecond: { $addToSet: '$connections' } } },
  ]);

  const secondIds = (secondDegreeResult[0]?.allSecond ?? []).map((id) => id.toString());
  if (secondIds.includes(targetId)) return '2nd';

  // 3rd degree: connection of a 2nd-degree connection
  const secondObjectIds = secondIds
    .filter((id: string) => id !== viewerId)
    .slice(0, 500)
    .map((id: string) => new Types.ObjectId(id));

  if (secondObjectIds.length === 0) return 'none';

  const thirdDegreeResult = await User.aggregate<{ allThird: string[] }>([
    { $match: { _id: { $in: secondObjectIds } } },
    { $project: { connections: 1 } },
    { $unwind: '$connections' },
    { $group: { _id: null, allThird: { $addToSet: '$connections' } } },
  ]);

  const thirdIds = (thirdDegreeResult[0]?.allThird ?? []).map((id) => id.toString());
  if (thirdIds.includes(targetId)) return '3rd';

  return 'none';
}
