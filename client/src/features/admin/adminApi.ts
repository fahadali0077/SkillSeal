// ─────────────────────────────────────────────────────────────────────────────
// adminApi.ts — typed client + React Query hooks for the platform-admin module.
// Mirrors the recruiterApi.ts convention: local interfaces, apiFetch wrapper,
// query keys, and thin useQuery/useMutation hooks.
// ─────────────────────────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_ORIGIN, apiFetch } from '../../lib/apiBase';

const BASE = `${API_ORIGIN}/api/v1/admin`;

// ── Shared shapes ────────────────────────────────────────────────────────────
export interface IPaginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IAdminStats {
  users: { total: number; suspended: number; byRole: Record<string, number>; newLast7d: number; newLast30d: number };
  verifications: { total: number; byStatus: Record<string, number> };
  sessions: { total: number; completed: number; terminated: number };
  catalog: { skills: number; activeSkills: number; jobs: number; activeJobs: number; posts: number };
  signupTrend: { date: string; count: number }[];
}

export interface IAdminUserRow {
  _id: string; firstName: string; lastName: string; email: string;
  role: string; status: string; accountType: string; emailVerified: boolean;
  profilePhoto: string; customUrl: string; connectionCount: number;
  suspendedReason: string; lastLoginAt: string | null; createdAt: string;
}

export interface IAdminUserDetail extends IAdminUserRow {
  headline: string; summary: string; location: { city?: string; country?: string };
  followerCount: number; followingCount: number; scheduledDeletionAt: string | null;
  verifications: { _id: string; skillName: string; tier: string; compositeScore: number; status: string; issuedAt: string; expiresAt: string; certificateId: string }[];
}

export interface IAdminVerificationRow {
  _id: string; userId: string; userName: string; skillName: string; tier: string;
  compositeScore: number; aiProbability: number; status: string; flagReason: string;
  certificateId: string; sessionId: string; issuedAt: string; expiresAt: string;
}

export interface IAdminSkillRow {
  _id: string; name: string; slug: string; category: string; availableTiers: string[];
  description: string; icon: string; isActive: boolean; totalVerified: number; createdAt: string;
}

export interface IAdminJobRow {
  _id: string; title: string; companyName: string; recruiterName: string;
  employmentType: string; workType: string; location: string; status: string;
  postedAt: string; createdAt: string;
}

export interface IAdminPostRow {
  _id: string; authorName: string; type: string; content: string;
  likeCount: number; commentCount: number; isDeleted: boolean; createdAt: string;
}

// ── Query param helpers ──────────────────────────────────────────────────────
export interface UserListParams { page?: number; limit?: number; search?: string; role?: string; status?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }
export interface VerifListParams { page?: number; limit?: number; status?: string; search?: string }
export interface JobListParams { page?: number; limit?: number; status?: string }
export interface PostListParams { page?: number; limit?: number; includeDeleted?: boolean }

function qs(params: Record<string, unknown> | object): string {
  const sp = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([k, v]) => { if (v !== undefined && v !== '' && v !== null) sp.set(k, String(v)); });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// ── Raw API ──────────────────────────────────────────────────────────────────
export const adminApi = {
  stats: () => apiFetch<IAdminStats>(`${BASE}/stats`),

  listUsers: (p: UserListParams) => apiFetch<IPaginated<IAdminUserRow>>(`${BASE}/users${qs(p)}`),
  getUser: (id: string) => apiFetch<IAdminUserDetail>(`${BASE}/users/${id}`),
  setRole: (id: string, role: string) => apiFetch<IAdminUserRow>(`${BASE}/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  suspendUser: (id: string, reason: string) => apiFetch<IAdminUserRow>(`${BASE}/users/${id}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  reactivateUser: (id: string) => apiFetch<IAdminUserRow>(`${BASE}/users/${id}/reactivate`, { method: 'PATCH' }),
  deleteUser: (id: string, immediate = false) => apiFetch<{ deleted: boolean; scheduledDeletionAt: string | null }>(`${BASE}/users/${id}${immediate ? '?immediate=true' : ''}`, { method: 'DELETE' }),

  listVerifications: (p: VerifListParams) => apiFetch<IPaginated<IAdminVerificationRow>>(`${BASE}/verifications${qs(p)}`),
  revokeVerification: (id: string, reason: string) => apiFetch<IAdminVerificationRow>(`${BASE}/verifications/${id}/revoke`, { method: 'PATCH', body: JSON.stringify({ reason }) }),

  listSkills: () => apiFetch<IAdminSkillRow[]>(`${BASE}/skills`),
  createSkill: (data: Partial<IAdminSkillRow>) => apiFetch<IAdminSkillRow>(`${BASE}/skills`, { method: 'POST', body: JSON.stringify(data) }),
  updateSkill: (id: string, data: Partial<IAdminSkillRow>) => apiFetch<IAdminSkillRow>(`${BASE}/skills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleSkill: (id: string) => apiFetch<IAdminSkillRow>(`${BASE}/skills/${id}/toggle`, { method: 'PATCH' }),

  listJobs: (p: JobListParams) => apiFetch<IPaginated<IAdminJobRow>>(`${BASE}/jobs${qs(p)}`),
  setJobStatus: (id: string, status: string) => apiFetch<IAdminJobRow>(`${BASE}/jobs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  listPosts: (p: PostListParams) => apiFetch<IPaginated<IAdminPostRow>>(`${BASE}/posts${qs(p)}`),
  deletePost: (id: string) => apiFetch<{ _id: string; isDeleted: boolean }>(`${BASE}/posts/${id}`, { method: 'DELETE' }),
};

// ── Query keys ───────────────────────────────────────────────────────────────
export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  users: (p: UserListParams) => ['admin', 'users', p] as const,
  user: (id: string) => ['admin', 'user', id] as const,
  verifications: (p: VerifListParams) => ['admin', 'verifications', p] as const,
  skills: ['admin', 'skills'] as const,
  jobs: (p: JobListParams) => ['admin', 'jobs', p] as const,
  posts: (p: PostListParams) => ['admin', 'posts', p] as const,
};

// ── Hooks ────────────────────────────────────────────────────────────────────
export function useAdminStats() {
  return useQuery({ queryKey: adminKeys.stats, queryFn: adminApi.stats, staleTime: 60_000 });
}

export function useAdminUsers(params: UserListParams) {
  return useQuery({ queryKey: adminKeys.users(params), queryFn: () => adminApi.listUsers(params), staleTime: 30_000 });
}

export function useAdminUser(id: string | null) {
  return useQuery({ queryKey: adminKeys.user(id ?? ''), queryFn: () => adminApi.getUser(id!), enabled: !!id, staleTime: 30_000 });
}

export function useUserMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    qc.invalidateQueries({ queryKey: ['admin', 'user'] });
    qc.invalidateQueries({ queryKey: adminKeys.stats });
  };
  return {
    setRole: useMutation({ mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.setRole(id, role), onSuccess: invalidate }),
    suspend: useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.suspendUser(id, reason), onSuccess: invalidate }),
    reactivate: useMutation({ mutationFn: (id: string) => adminApi.reactivateUser(id), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: ({ id, immediate }: { id: string; immediate?: boolean }) => adminApi.deleteUser(id, immediate), onSuccess: invalidate }),
  };
}

export function useAdminVerifications(params: VerifListParams) {
  return useQuery({ queryKey: adminKeys.verifications(params), queryFn: () => adminApi.listVerifications(params), staleTime: 30_000 });
}

export function useRevokeVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.revokeVerification(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'verifications'] }); qc.invalidateQueries({ queryKey: adminKeys.stats }); },
  });
}

export function useAdminSkills() {
  return useQuery({ queryKey: adminKeys.skills, queryFn: adminApi.listSkills, staleTime: 60_000 });
}

export function useSkillMutations() {
  const qc = useQueryClient();
  const invalidate = () => { qc.invalidateQueries({ queryKey: adminKeys.skills }); qc.invalidateQueries({ queryKey: adminKeys.stats }); };
  return {
    create: useMutation({ mutationFn: (data: Partial<IAdminSkillRow>) => adminApi.createSkill(data), onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<IAdminSkillRow> }) => adminApi.updateSkill(id, data), onSuccess: invalidate }),
    toggle: useMutation({ mutationFn: (id: string) => adminApi.toggleSkill(id), onSuccess: invalidate }),
  };
}

export function useAdminJobs(params: JobListParams) {
  return useQuery({ queryKey: adminKeys.jobs(params), queryFn: () => adminApi.listJobs(params), staleTime: 30_000 });
}

export function useSetJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminApi.setJobStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'jobs'] }); qc.invalidateQueries({ queryKey: adminKeys.stats }); },
  });
}

export function useAdminPosts(params: PostListParams) {
  return useQuery({ queryKey: adminKeys.posts(params), queryFn: () => adminApi.listPosts(params), staleTime: 30_000 });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deletePost(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'posts'] }); qc.invalidateQueries({ queryKey: adminKeys.stats }); },
  });
}
