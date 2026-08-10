// ─────────────────────────────────────────────────────────────────────────────
// messagingApi.ts  –  typed REST calls for the messaging system
// ─────────────────────────────────────────────────────────────────────────────

import { API_ORIGIN, apiFetch } from '../../lib/apiBase';
import { useAuthStore } from '../auth/useAuth';
const BASE = `${API_ORIGIN}/api/v1/messages`;


// ── Output shapes (mirror server) ─────────────────────────────────────────────

export interface IMessageOut {
  _id:             string;
  threadId:        string;
  senderId:        string;
  // recipientId removed — SCHEMA BUG 6: no longer stored on Message documents.
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

  requestCount: () =>
    apiFetch<{ count: number }>(`${BASE}/requests/count`),

  uploadAttachment: async (file: File): Promise<{ url: string; type: string; name: string; sizeBytes: number }> => {
    const form = new FormData();
    form.append('file', file);

    // BROKEN-05: an AbortController with a 30-second timeout. The previous
    // fetch had no timeout, so a Cloudinary stall left the spinner running
    // forever and the user couldn't tell something had gone wrong.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('timeout'), 30_000);

    try {
      const res = await fetch(`${BASE}/upload`, {
        method: 'POST',
        credentials: 'include',
        // AUDIT §1.3: in-memory token, not localStorage.
        headers: { 'Authorization': `Bearer ${useAuthStore.getState().accessToken ?? ''}` },
        body: form,
        signal: controller.signal,
      });
      const json = await res.json() as { success: boolean; data: { url: string; type: string; name: string; sizeBytes: number } };
      if (!json.success) throw new Error('Upload failed');
      return json.data;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new Error('Upload timed out after 30 seconds. Please try again.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  search: (query: string) =>
    apiFetch<IMessageOut[]>(`${BASE}/search?query=${encodeURIComponent(query)}`),
};
