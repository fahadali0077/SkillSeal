// ─────────────────────────────────────────────────────────────────────────────
// socket.ts  –  /server/src/socket/socket.ts
// Full Socket.io server with JWT authentication, per-user rooms, and all
// real-time events for messaging, notifications, and session actions.
// ─────────────────────────────────────────────────────────────────────────────

import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import type { ITokenPayload } from '@SkillSeal/shared';
import { getRedis } from '../config/redis';
import logger from '../utils/logger';
import { allowedOrigins } from '../config/origins';

// BROKEN-09: Redis presence tracking. We SET presence:{userId} on each socket
// connect with a 5-minute TTL refresh, and DEL on disconnect *only* if no
// other sockets remain for that user (handled via a counter). The TTL is a
// safety net for ungraceful disconnects where the disconnect handler doesn't
// fire (server crash, network partition). messages.service.ts:getUserMini
// reads these keys to populate isOnline.
const PRESENCE_PREFIX = 'presence:';
const PRESENCE_TTL_SEC = 5 * 60;
function presenceKey(userId: string) { return `${PRESENCE_PREFIX}${userId}`; }
function presenceCountKey(userId: string) { return `${PRESENCE_PREFIX}count:${userId}`; }

// ── Event constants ───────────────────────────────────────────────────────────

export const SOCKET_EVENTS = {
  // Server → Client
  NEW_MESSAGE: 'new_message',
  TYPING: 'typing',
  STOP_TYPING: 'stop_typing',
  READ_RECEIPT: 'read_receipt',
  NOTIFICATION: 'notification',
  SESSION_ACTION: 'session_action',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  VERIFICATION_COMPLETE: 'verification_complete',

  // Client → Server
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  MARK_READ: 'mark_read',
} as const;

export type SocketEventKey = keyof typeof SOCKET_EVENTS;
export type SocketEventValue = typeof SOCKET_EVENTS[SocketEventKey];

// ── Augment socket with authenticated user ────────────────────────────────────

interface AuthenticatedSocket extends Socket {
  user: ITokenPayload;
}

// ── Module-level IO instance ──────────────────────────────────────────────────

let io: SocketServer;

export function getIO(): SocketServer {
  if (!io) throw new Error('[socket] Not initialized — call initSocket() first');
  return io;
}

/** Emit to a specific user's room (all their connected tabs/devices) */
export function emitToUser(
  userId: string,
  event: SocketEventValue,
  data: unknown,
): void {
  try {
    io?.to(`user:${userId}`).emit(event, data);
  } catch (err) {
    logger.warn(`[socket] emitToUser failed: userId=${userId} event=${event}`, err);
  }
}

/** Emit to all participants of a session room */
export function emitToSession(
  sessionId: string,
  event: SocketEventValue,
  data: unknown,
): void {
  try {
    io?.to(`session:${sessionId}`).emit(event, data);
  } catch (err) {
    logger.warn(`[socket] emitToSession failed: sessionId=${sessionId}`, err);
  }
}

// ── Initializer ───────────────────────────────────────────────────────────────

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      // AUDIT §2.3: was a single CLIENT_URL value, which silently broke every
      // real-time feature for anyone on the www host. Shares app.ts's allowlist now.
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60_000,
    pingInterval: 25_000,
    // Allow reconnection — client will re-authenticate via handshake
    transports: ['websocket', 'polling'],
  });

  // ── JWT authentication middleware ────────────────────────────────────────
  io.use((socket, next) => {
    const token =
      (socket.handshake.auth as Record<string, string>)['token'] ||
      (socket.handshake.headers['authorization'] as string | undefined)?.replace('Bearer ', '');

    if (!token) {
      logger.warn(`[socket] Connection rejected: no token (socketId=${socket.id})`);
      return next(new Error('Authentication required'));
    }

    try {
      const payload = verifyAccessToken(token);
      (socket as AuthenticatedSocket).user = payload;
      next();
    } catch (err) {
      logger.warn(`[socket] Connection rejected: invalid token (socketId=${socket.id})`);
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────
  io.on('connection', (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const { userId } = socket.user;

    // Auto-join personal room on connect — all server→client events use this
    socket.join(`user:${userId}`);
    logger.info(`[socket] Connected: userId=${userId} socketId=${socket.id}`);

    // BROKEN-09: mark this user as online in Redis. The counter tracks how
    // many open sockets they have so we only clear the presence key when
    // the last one disconnects.
    void (async () => {
      try {
        const redis = getRedis();
        await redis.incr(presenceCountKey(userId));
        await redis.set(presenceKey(userId), '1', 'EX', PRESENCE_TTL_SEC);
      } catch (err) { logger.warn(`[socket] presence set failed: ${(err as Error).message}`); }
    })();

    // Notify network that user is online
    emitToUser(userId, SOCKET_EVENTS.USER_ONLINE, { userId });

    // ── Client events ────────────────────────────────────────────────────

    // typing_start: relay to recipient
    socket.on(SOCKET_EVENTS.TYPING_START, (data: { recipientId: string; threadId: string }) => {
      if (!data?.recipientId || !data?.threadId) return;
      emitToUser(data.recipientId, SOCKET_EVENTS.TYPING, {
        threadId: data.threadId,
        senderId: userId,
      });
    });

    // typing_stop: relay stop signal
    socket.on(SOCKET_EVENTS.TYPING_STOP, (data: { recipientId: string; threadId: string }) => {
      if (!data?.recipientId || !data?.threadId) return;
      emitToUser(data.recipientId, SOCKET_EVENTS.STOP_TYPING, {
        threadId: data.threadId,
        senderId: userId,
      });
    });

    // join_room: join an arbitrary room (e.g. session:sessionId)
    socket.on(SOCKET_EVENTS.JOIN_ROOM, (roomId: string) => {
      if (!roomId || typeof roomId !== 'string') return;
      socket.join(roomId);
      logger.info(`[socket] userId=${userId} joined room=${roomId}`);
    });

    // leave_room
    socket.on(SOCKET_EVENTS.LEAVE_ROOM, (roomId: string) => {
      socket.leave(roomId);
    });

    // ── Disconnect ───────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info(`[socket] Disconnected: userId=${userId} socketId=${socket.id} reason=${reason}`);
      // BROKEN-09: clear Redis presence only if this was the user's last socket.
      void (async () => {
        try {
          const redis = getRedis();
          const remaining = await redis.decr(presenceCountKey(userId));
          if (remaining <= 0) {
            await redis.del(presenceKey(userId));
            await redis.del(presenceCountKey(userId));
            emitToUser(userId, SOCKET_EVENTS.USER_OFFLINE, { userId });
          }
        } catch (err) { logger.warn(`[socket] presence clear failed: ${(err as Error).message}`); }
      })();
    });

    // ── Error handler ────────────────────────────────────────────────────
    socket.on('error', (err) => {
      logger.error(`[socket] Error: userId=${userId}`, err);
    });
  });

  logger.info('[socket] Socket.io initialized');
  return io;
}
