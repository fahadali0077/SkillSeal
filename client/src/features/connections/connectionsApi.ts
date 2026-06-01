// ─────────────────────────────────────────────────────────────────────────────
// connectionsApi.ts
// All connection + suggestion API calls.
// ─────────────────────────────────────────────────────────────────────────────

import { API_ORIGIN, apiFetch } from '../../lib/apiBase';
const CONN_BASE = `${API_ORIGIN}/api/v1/connections`;
const SUGG_BASE = `${API_ORIGIN}/api/v1/suggestions`;
const USER_BASE = `${API_ORIGIN}/api/v1/users`;


// ── Shapes ────────────────────────────────────────────────────────────────────

export interface UserMini {
  _id:          string;
  fullName:     string;
  firstName:    string;
  lastName:     string;
  headline:     string;
  profilePhoto: string;
  customUrl:    string;
  connectionCount: number;
}

export interface ConnRequestItem {
  connectionId: string;
  user:         UserMini;
  note:         string;
  createdAt:    string;
}

export interface SuggestedUser {
  userId:          string;
  fullName:        string;
  firstName:       string;
  lastName:        string;
  headline:        string;
  profilePhoto:    string;
  customUrl:       string;
  connectionCount: number;
  mutualCount:     number;
  score:           number;
  reason:          string;
}

export interface PeopleSearchResult {
  userId:           string;
  fullName:         string;
  firstName:        string;
  lastName:         string;
  headline:         string;
  profilePhoto:     string;
  customUrl:        string;
  connectionCount:  number;
  mutualCount:      number;
  connectionStatus: 'none' | 'pending' | 'accepted';
  connectionId?:    string;
  matchedOn:        'name' | 'headline' | 'skill';
}

// ── API object ────────────────────────────────────────────────────────────────

export const connectionsApi = {
  // List own connections
  list: (params?: { search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.page)   qs.set('page',   String(params.page));
    if (params?.limit)  qs.set('limit',  String(params.limit));
    return apiFetch<{ connections: UserMini[]; total: number }>(
      `${CONN_BASE}?${qs}`
    );
  },

  // Pending incoming
  pending: () => apiFetch<ConnRequestItem[]>(`${CONN_BASE}/pending`),

  // Sent outgoing
  sent: () => apiFetch<ConnRequestItem[]>(`${CONN_BASE}/sent`),

  // Send request
  sendRequest: (recipientId: string, note?: string) =>
    apiFetch<{ connectionId: string }>(`${CONN_BASE}/request`, {
      method: 'POST',
      body: JSON.stringify({ recipientId, note }),
    }),

  // Accept
  accept: (connectionId: string) =>
    apiFetch<null>(`${CONN_BASE}/${connectionId}/accept`, { method: 'PUT' }),

  // Decline
  decline: (connectionId: string) =>
    apiFetch<null>(`${CONN_BASE}/${connectionId}/decline`, { method: 'PUT' }),

  // Remove / withdraw
  remove: (connectionId: string) =>
    apiFetch<null>(`${CONN_BASE}/${connectionId}`, { method: 'DELETE' }),

  // Block / unblock
  block:   (targetId: string) => apiFetch<null>(`${SUGG_BASE}/users/${targetId}/block`,   { method: 'POST' }),
  unblock: (targetId: string) => apiFetch<null>(`${SUGG_BASE}/users/${targetId}/block`,   { method: 'DELETE' }),

  // Follow / unfollow
  follow:   (targetId: string) => apiFetch<null>(`${SUGG_BASE}/users/${targetId}/follow`, { method: 'POST' }),
  unfollow: (targetId: string) => apiFetch<null>(`${SUGG_BASE}/users/${targetId}/follow`, { method: 'DELETE' }),

  // PYMK suggestions
  suggestions: () => apiFetch<SuggestedUser[]>(`${SUGG_BASE}/people`),

  // People search — separate from job search; matches name / headline / skill
  peopleSearch: (q: string, page = 1, limit = 20) => {
    const qs = new URLSearchParams({ q, page: String(page), limit: String(limit) });
    return apiFetch<{
      results:    PeopleSearchResult[];
      total:      number;
      page:       number;
      totalPages: number;
    }>(`${USER_BASE}/people-search?${qs}`);
  },
};
