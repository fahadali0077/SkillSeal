import type { IQuestion, ISessionState, SkillTier } from '@SkillSeal/shared';
import { API_ORIGIN, apiFetch } from '../../lib/apiBase';
const SESSIONS_BASE = `${API_ORIGIN}/api/v1/sessions`, ANSWERS_BASE = `${API_ORIGIN}/api/v1/answers`, EVENTS_BASE = `${API_ORIGIN}/api/v1/events`, SKILLS_BASE = `${API_ORIGIN}/api/v1/skills`;
export type PlanId = 'pro_monthly' | 'pro_yearly' | 'recruiter_monthly' | 'recruiter_yearly';
export interface ISkillOption { _id: string; name: string; slug: string; category: string; icon: string; availableTiers: string[]; }
export interface IMyVerification {
  verificationId: string | null; sessionId: string | null; skillId: string; skillName: string; skillIcon: string;
  skillCategory: string; tier: string; compositeScore: number; certificateId: string | null;
  status: 'VERIFIED' | 'FLAGGED' | 'EXPIRED' | 'REVOKED' | 'FAILED' | 'TERMINATED';
  issuedAt: string; expiresAt: string | null; isExpired: boolean; isCertified: boolean;
}
export const assessmentApi = {
  fetchSkills: () => apiFetch<ISkillOption[]>(SKILLS_BASE),
  fetchMyVerifications: () => apiFetch<IMyVerification[]>(`${SESSIONS_BASE}/my-verifications`),
  deleteAttempt: (sessionId: string) =>
    apiFetch<{ deleted: boolean }>(`${SESSIONS_BASE}/${sessionId}`, { method: 'DELETE' }),
  abandonSession: () => apiFetch<Record<string, never>>(`${SESSIONS_BASE}/abandon`, { method: 'POST', body: JSON.stringify({}) }),
  startSession: (skillId: string, tier: SkillTier) => apiFetch<{ sessionId: string; firstQuestion: IQuestion; sessionState: ISessionState }>(`${SESSIONS_BASE}/start`, { method: 'POST', body: JSON.stringify({ skillId, tier }) }),
  submitAnswer: (sessionId: string, questionId: string, selectedOption: string | null, textAnswer: string, timeTaken: number, isTimeout: boolean, submittedAt: string) => apiFetch<{ accepted: boolean; isCorrect: boolean | null; conceptScore: number; sessionComplete: boolean; sessionState: ISessionState; nextQuestion: IQuestion | null; result?: unknown }>(`${ANSWERS_BASE}/submit`, { method: 'POST', body: JSON.stringify({ sessionId, questionId, selectedOption, textAnswer, timeTaken, isTimeout, submittedAt }) }),
  logEvent: (sessionId: string, eventType: string, questionId: string | null, timeOnQuestion: number, tabHiddenDurationMs?: number) => apiFetch<{ strikeCount: number; action: string }>(`${EVENTS_BASE}/log`, { method: 'POST', body: JSON.stringify({ sessionId, eventType, questionId, timeOnQuestion, tabHiddenDurationMs }) }),
  getState: (sessionId: string) => apiFetch<ISessionState>(`${SESSIONS_BASE}/${sessionId}/state`),
  recordStrike: (sessionId: string, eventType: string, details?: string) => apiFetch<{ strikeCount: number; terminated: boolean }>(`${SESSIONS_BASE}/${sessionId}/strike`, { method: 'POST', body: JSON.stringify({ eventType, details }) }),
};
