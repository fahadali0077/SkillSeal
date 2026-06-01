// ─────────────────────────────────────────────────────────────────────────────
// messaging.types.ts
// Shared messaging types for SkillSeal client & server
// ─────────────────────────────────────────────────────────────────────────────

// ── Attachment ────────────────────────────────────────────────────────────────

export type AttachmentType = 'image' | 'document' | 'video' | 'audio' | 'other';

export interface IAttachment {
  url: string;
  type: AttachmentType;
  name: string;
  sizeBytes: number;
}

// ── Reaction ──────────────────────────────────────────────────────────────────

export interface IMessageReaction {
  userId: string;
  emoji: string;
  reactedAt: string;       // ISO date string
}

// ── Message participant mini-profile ─────────────────────────────────────────

export interface IParticipant {
  userId: string;
  fullName: string;
  profilePhoto: string;
  headline: string;
  customUrl: string;
  isOnline: boolean;
  lastSeenAt: string | null;    // ISO date string; null if user hides presence
}

// ── Individual message ────────────────────────────────────────────────────────

export interface IMessage {
  _id: string;
  threadId: string;
  senderId: string;
  recipientId: string;
  content: string;
  attachments: IAttachment[];
  reactions: IMessageReaction[];
  readAt: string | null;        // ISO date string; null = unread
  isDeleted: boolean;
  isInMailMessage: boolean;     // InMail-style cold outreach (premium feature)
  createdAt: string;
  updatedAt: string;
}

// ── Thread ────────────────────────────────────────────────────────────────────

export interface IThread {
  _id: string;
  participants: IParticipant[];
  lastMessage: Pick<IMessage, '_id' | 'senderId' | 'content' | 'createdAt'> | null;
  unreadCount: number;           // relative to the requesting user
  isArchived: boolean;
  isMuted: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Message thread (full thread view = thread metadata + messages) ─────────────

export interface IMessageThread {
  thread: IThread;
  messages: IMessage[];         // paginated; newest first
  hasMore: boolean;
  nextCursor: string | null;    // cursor-based pagination for real-time safety
}

// ── Socket payloads ───────────────────────────────────────────────────────────

export interface ISendMessagePayload {
  threadId: string;
  recipientId: string;
  content: string;
  attachments?: Omit<IAttachment, 'url'>[];   // pre-upload metadata
}

export interface IMarkReadPayload {
  threadId: string;
  messageIds: string[];
}
