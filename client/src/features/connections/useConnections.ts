import { API_ORIGIN, apiFetch } from '../../lib/apiBase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BASE = `${API_ORIGIN}/api/v1/connections`;

export const connKeys = {
  pending:     () => ['connections', 'pending'] as const,
  connections: () => ['connections', 'list']    as const,
  suggestions: () => ['suggestions']            as const,
  sent:        () => ['connections', 'sent']    as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function usePendingRequests() {
  return useQuery({
    queryKey: connKeys.pending(),
    queryFn: () => apiFetch<{
      connectionId: string;
      user: { _id: string; fullName: string; firstName: string; lastName: string;
               profilePhoto: string; headline: string; customUrl: string };
      note: string; createdAt: string;
    }[]>(`${BASE}/pending`),
    staleTime: 30_000,
  });
}

export function useConnections(search?: string) {
  return useQuery({
    queryKey: [...connKeys.connections(), search],
    queryFn: () => apiFetch<{
      connections: { _id: string; firstName: string; lastName: string;
                     profilePhoto: string; headline: string; customUrl: string }[];
      total: number;
    }>(`${BASE}?${search ? `search=${encodeURIComponent(search)}` : ''}`),
    staleTime: 60_000,
  });
}

export function useSuggestions() {
  return useQuery({
    queryKey: connKeys.suggestions(),
    queryFn: () => apiFetch<{
      userId: string; firstName: string; lastName: string;
      profilePhoto: string; headline: string; customUrl: string;
      mutualConnections: number;
    }[]>(`${API_ORIGIN}/api/v1/suggestions/people`),
    staleTime: 5 * 60_000,
  });
}

// ── Mutations — every mutation invalidates ['profile'] so that the
// ConnectionButton on profile pages reflects the new status immediately.
// Without this, the profile cache keeps connectionStatus:'none' and
// the button always shows "Connect" even after connecting. ────────────────────

export function useSendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recipientId, note }: { recipientId: string; note?: string }) =>
      apiFetch<{ connectionId: string }>(
        `${BASE}/request`,
        { method: 'POST', body: JSON.stringify({ recipientId, note }) },
      ),
    onSuccess: () => {
      // Bust ALL profile caches so connectionStatus switches to 'pending'
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: connKeys.sent() });
      qc.invalidateQueries({ queryKey: connKeys.suggestions() });
    },
  });
}

export function useAcceptRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      apiFetch<null>(`${BASE}/${requestId}/accept`, { method: 'PUT' }),
    onSuccess: () => {
      // Bust ALL profile caches so connectionStatus switches to 'accepted'
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: connKeys.pending() });
      qc.invalidateQueries({ queryKey: connKeys.connections() });
    },
  });
}

export function useDeclineRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      apiFetch<null>(`${BASE}/${requestId}/decline`, { method: 'PUT' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: connKeys.pending() });
    },
  });
}

export function useRemoveConnection() {
  const qc = useQueryClient();
  return useMutation({
    // /with/:userId resolves the connection by user pair — no connection _id needed.
    mutationFn: (userId: string) =>
      apiFetch<null>(`${BASE}/with/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: connKeys.connections() });
      qc.invalidateQueries({ queryKey: connKeys.suggestions() });
    },
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<null>(`${API_ORIGIN}/api/v1/suggestions/users/${userId}/block`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: connKeys.suggestions() }),
  });
}

export function getConnectionDegree(_: string, __: string): Promise<'1st' | '2nd' | '3rd' | 'none'> {
  return Promise.resolve('none');
}

// ── Follow / Unfollow ─────────────────────────────────────────────────────────

export function useFollowUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<null>(`${API_ORIGIN}/api/v1/users/${userId}/follow`, { method: 'POST' }),
    onSuccess: (_, userId) => {
      qc.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}

export function useUnfollowUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<null>(`${API_ORIGIN}/api/v1/users/${userId}/follow`, { method: 'DELETE' }),
    onSuccess: (_, userId) => {
      qc.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}
