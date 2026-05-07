// ─────────────────────────────────────────────────────────────────────────────
// messagingApi.ts  –  typed REST calls for the messaging system
// ─────────────────────────────────────────────────────────────────────────────

import { API_ORIGIN } from '../../lib/apiBase';
const BASE = `${API_ORIGIN}/api/v1/messages`;

async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init,
  });
  const json = await res.json() as { success: boolean; data: T; message: string };
  if (!json.success) throw new Error((json as unknown as { message: string }).message);
  return json.data;
}

// ── Output shapes (mirror server) ─────────────────────────────────────────────

export interface IMessageOut {
  _id:             string;
  threadId:        string;
  senderId:        string;
  recipientId:     string;
  content:         string;
  attachments:     { url: string; type: string; name: string; sizeBytes: number }[];
  reactions:       { userId: string; emoji: string }[];
  readAt:          string | null;
  isDeleted:       boolean;
  isInMailMessage: boolean;
  createdAt:       string;
  updatedAt:       string;
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
  threadId:    string;
  participant: IParticipantMini;
  lastMessage: { content: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
  isRequest:   boolean;
  updatedAt:   string;
}

export interface IThreadData {
  messages:    IMessageOut[];
  participant: IParticipantMini;
  hasMore:     boolean;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const messagingApi = {
  listThreads: () =>
    apiFetch<IThreadSummary[]>(`${BASE}/threads`),

  getThread: (threadId: string, page = 1) =>
    apiFetch<IThreadData>(`${BASE}/threads/${threadId}?page=${page}&limit=50`),

  send: (recipientId: string, content: string, attachments?: { url: string; type: string; name: string; sizeBytes: number }[]) =>
    apiFetch<IMessageOut>(`${BASE}/send`, {
      method: 'POST',
      body: JSON.stringify({ recipientId, content, attachments }),
    }),

  markRead: (threadId: string) =>
    apiFetch<null>(`${BASE}/threads/${threadId}/read`, { method: 'PUT' }),

  deleteMessage: (messageId: string) =>
    apiFetch<IMessageOut>(`${BASE}/${messageId}`, { method: 'DELETE' }),

  listRequests: () =>
    apiFetch<IThreadSummary[]>(`${BASE}/requests`),

  acceptRequest: (requestId: string) =>
    apiFetch<null>(`${BASE}/requests/${requestId}/accept`, { method: 'POST' }),

  ignoreRequest: (requestId: string) =>
    apiFetch<null>(`${BASE}/requests/${requestId}/ignore`, { method: 'POST' }),

  search: (query: string) =>
    apiFetch<IMessageOut[]>(`${BASE}/search?query=${encodeURIComponent(query)}`),
};
