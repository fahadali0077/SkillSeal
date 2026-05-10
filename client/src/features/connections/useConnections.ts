import { API_ORIGIN, apiFetch } from '../../lib/apiBase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BASE = `${API_ORIGIN}/api/v1/connections`;

export const connKeys = {
  pending:     () => ['connections', 'pending'] as const,
  connections: () => ['connections', 'list']    as const,
  suggestions: () => ['suggestions']            as const,
  sent:        () => ['connections', 'sent']    as const,
};

// GET /connections/pending
export function usePendingRequests() {
  return useQuery({
    queryKey: connKeys.pending(),
    queryFn: () => apiFetch<{ _id: string; requesterId: { _id: string; fullName: string; profilePhoto: string; headline: string; customUrl: string } }[]>(
      `${BASE}/pending`,                              // was: /requests/pending ❌
    ),
    staleTime: 30_000,
  });
}

// GET /connections
export function useConnections(search?: string) {
  return useQuery({
    queryKey: [...connKeys.connections(), search],
    queryFn: () => apiFetch<{ _id: string; firstName: string; lastName: string; profilePhoto: string; headline: string; customUrl: string }[]>(
      `${BASE}?${search ? `search=${encodeURIComponent(search)}` : ''}`,
    ),
    staleTime: 60_000,
  });
}

// GET /api/v1/suggestions/people
export function useSuggestions() {
  return useQuery({
    queryKey: connKeys.suggestions(),
    queryFn: () => apiFetch<{ userId: string; firstName: string; lastName: string; profilePhoto: string; headline: string; customUrl: string; mutualConnections: number }[]>(
      `${API_ORIGIN}/api/v1/suggestions/people`,
    ),
    staleTime: 5 * 60_000,
  });
}

// POST /connections/request  (no 's')
export function useSendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recipientId, note }: { recipientId: string; note?: string }) =>
      apiFetch<{ connectionId: string }>(
        `${BASE}/request`,                            // was: /requests ❌
        { method: 'POST', body: JSON.stringify({ recipientId, note }) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: connKeys.sent() });
      qc.invalidateQueries({ queryKey: connKeys.suggestions() });
    },
  });
}

// PUT /connections/:id/accept
export function useAcceptRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      apiFetch<null>(
        `${BASE}/${requestId}/accept`,                // was: /requests/:id/accept POST ❌
        { method: 'PUT' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: connKeys.pending() });
      qc.invalidateQueries({ queryKey: connKeys.connections() });
    },
  });
}

// PUT /connections/:id/decline
export function useDeclineRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      apiFetch<null>(
        `${BASE}/${requestId}/decline`,               // was: /requests/:id/ignore POST ❌
        { method: 'PUT' },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: connKeys.pending() }),
  });
}

// DELETE /connections/:id
export function useRemoveConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<null>(`${BASE}/${userId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: connKeys.connections() }),
  });
}

// POST /suggestions/users/:id/block
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
    onSuccess: (_, userId) => { qc.invalidateQueries({ queryKey: ['profile', userId] }); },
  });
}

export function useUnfollowUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<null>(`${API_ORIGIN}/api/v1/users/${userId}/follow`, { method: 'DELETE' }),
    onSuccess: (_, userId) => { qc.invalidateQueries({ queryKey: ['profile', userId] }); },
  });
}
