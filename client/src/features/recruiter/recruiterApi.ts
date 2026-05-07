import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SkillTier } from '@SkillSeal/shared';
const BASE = '/api/v1/recruiter';
async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, credentials: 'include', ...init });
  const json = await res.json() as { success: boolean; data: T; message: string };
  if (!json.success) throw new Error((json as unknown as { message: string }).message);
  return json.data;
}
export type IntegrityLevel = 'green' | 'yellow' | 'red';
export interface IVerifiedSkillBadge { skillId: string; skillName: string; skillSlug: string; tier: SkillTier; compositeScore: number; issuedAt: string; status: string; }
export interface ICandidateCard { userId: string; firstName: string; lastName: string; fullName: string; headline: string; location: { city?: string; country?: string }; profilePhoto: string; customUrl: string; openToWork: boolean; verifiedSkills: IVerifiedSkillBadge[]; behaviorIntegrity: IntegrityLevel; aiFlag: boolean; connectionDegree: '1st' | '2nd' | '3rd' | 'none'; }
export interface IVerificationFull { _id: string; skillName: string; tier: string; compositeScore: number; conceptScore: number; speedScore: number; consistencyScore: number; behaviorScore: number; aiScore: number; aiProbability: number; sessionId: string; certificateId: string; issuedAt: string; expiresAt: string; status: string; flagReason: string; }
export interface ICandidateFullView { profile: { _id: string; firstName: string; lastName: string; headline: string; location: { city?: string; country?: string }; profilePhoto: string; customUrl: string; openToWork: boolean; experience: unknown[]; education: unknown[]; skills: unknown[]; }; verifications: IVerificationFull[]; pipelineEntry: IPipelineEntry | null; }
export interface IAnswerAudit { questionType: string; difficulty: string; timeTaken: number; isCorrect: boolean | null; isTimeout: boolean; conceptScore: number; aiScore: number; }
export interface IEventAudit { eventType: string; timestamp: string; strikeCount: number; tabHiddenMs: number; }
export interface ISessionAudit { session: { _id: string; skillName: string; declaredTier: string; finalTier: string; status: string; compositeScore: number; conceptScore: number; speedScore: number; consistencyScore: number; behaviorScore: number; aiScore: number; aiProbability: number; strikeCount: number; durationMs: number; startTime: string; endTime: string; }; answers: IAnswerAudit[]; events: IEventAudit[]; }
export interface IPipelineEntry { _id: string; candidateId: string; jobId: string | null; status: string; note: string; recruiterId: string; createdAt: string; updatedAt: string; }
export interface IPipelineCandidate { applicationId: string; candidateId: string; fullName: string; headline: string; profilePhoto: string; customUrl: string; status: string; note: string; appliedAt: string; verifiedSkills: IVerifiedSkillBadge[]; behaviorIntegrity: IntegrityLevel; aiFlag: boolean; }
export type IPipelineGrouped = Record<string, IPipelineCandidate[]>;
export interface TalentSearchParams { skill?: string; tier?: string; verifiedOnly?: boolean; location?: string; openToWork?: boolean; sort?: 'score' | 'date' | 'active'; page?: number; }
export const recruiterApi = {
  searchCandidates: (p: TalentSearchParams) => { const qs = new URLSearchParams(); Object.entries(p).forEach(([k, v]) => v !== undefined && qs.set(k, String(v))); return apiFetch<{ candidates: ICandidateCard[]; total: number }>(`${BASE}/candidates?${qs}`); },
  getCandidate: (userId: string) => apiFetch<ICandidateFullView>(`${BASE}/candidates/${userId}`),
  getAudit: (sessionId: string) => apiFetch<ISessionAudit>(`${BASE}/sessions/${sessionId}`),
  upsertPipeline: (data: { candidateId: string; jobId?: string; status: string; note?: string }) => apiFetch<IPipelineEntry>(`${BASE}/pipeline`, { method: 'POST', body: JSON.stringify(data) }),
  getPipeline: (jobId?: string) => apiFetch<IPipelineGrouped>(`${BASE}/pipeline${jobId ? `?jobId=${jobId}` : ''}`),
  exportCsv: (filters: { jobId?: string; skillId?: string; tier?: string }) => { const qs = new URLSearchParams(); Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v)); return fetch(`${BASE}/export?${qs}`, { credentials: 'include' }); },
};
export const recruiterKeys = { candidates: (p: TalentSearchParams) => ['recruiter', 'candidates', p] as const, candidate: (id: string) => ['recruiter', 'candidate', id] as const, audit: (id: string) => ['recruiter', 'audit', id] as const, pipeline: (jobId?: string) => ['recruiter', 'pipeline', jobId] as const };
export function useCandidateSearch(params: TalentSearchParams, enabled = true) { return useQuery({ queryKey: recruiterKeys.candidates(params), queryFn: () => recruiterApi.searchCandidates(params), enabled, staleTime: 60_000 }); }
export function useCandidate(userId: string) { return useQuery({ queryKey: recruiterKeys.candidate(userId), queryFn: () => recruiterApi.getCandidate(userId), enabled: !!userId, staleTime: 60_000 }); }
export function useSessionAudit(sessionId: string) { return useQuery({ queryKey: recruiterKeys.audit(sessionId), queryFn: () => recruiterApi.getAudit(sessionId), enabled: !!sessionId, staleTime: Infinity }); }
export function usePipeline(jobId?: string) { return useQuery({ queryKey: recruiterKeys.pipeline(jobId), queryFn: () => recruiterApi.getPipeline(jobId), staleTime: 30_000 }); }
export function useUpsertPipeline() { const qc = useQueryClient(); return useMutation({ mutationFn: recruiterApi.upsertPipeline, onSuccess: () => qc.invalidateQueries({ queryKey: ['recruiter', 'pipeline'] }) }); }
export function useExportCsv() { return useMutation({ mutationFn: async (filters: { jobId?: string; skillId?: string; tier?: string }) => { const res = await recruiterApi.exportCsv(filters); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'SkillSeal-candidates.csv'; a.click(); URL.revokeObjectURL(url); } }); }
