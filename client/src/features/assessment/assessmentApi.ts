import type { IQuestion, ISessionState, SkillTier } from '@SkillSeal/shared';
const SESSIONS_BASE = '/api/v1/sessions', ANSWERS_BASE = '/api/v1/answers', EVENTS_BASE = '/api/v1/events';
async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, credentials: 'include', ...init });
  const json = await res.json() as { success: boolean; data: T; message: string };
  if (!json.success) throw new Error((json as unknown as { message: string }).message);
  return json.data;
}
export type PlanId = 'pro_monthly' | 'pro_yearly' | 'recruiter_monthly' | 'recruiter_yearly';
export const assessmentApi = {
  startSession: (skillId: string, tier: SkillTier) => apiFetch<{ sessionId: string; firstQuestion: IQuestion; sessionState: ISessionState }>(`${SESSIONS_BASE}/start`, { method: 'POST', body: JSON.stringify({ skillId, tier }) }),
  submitAnswer: (sessionId: string, questionId: string, selectedOption: string | null, textAnswer: string, timeTaken: number, isTimeout: boolean, submittedAt: string) => apiFetch<{ accepted: boolean; isCorrect: boolean | null; conceptScore: number; sessionComplete: boolean; sessionState: ISessionState; nextQuestion: IQuestion | null; result?: unknown }>(`${ANSWERS_BASE}/submit`, { method: 'POST', body: JSON.stringify({ sessionId, questionId, selectedOption, textAnswer, timeTaken, isTimeout, submittedAt }) }),
  logEvent: (sessionId: string, eventType: string, questionId: string | null, timeOnQuestion: number, tabHiddenDurationMs?: number) => apiFetch<{ strikeCount: number; action: string }>(`${EVENTS_BASE}/log`, { method: 'POST', body: JSON.stringify({ sessionId, eventType, questionId, timeOnQuestion, tabHiddenDurationMs }) }),
  getState: (sessionId: string) => apiFetch<ISessionState>(`${SESSIONS_BASE}/${sessionId}/state`),
  recordStrike: (sessionId: string, eventType: string, details?: string) => apiFetch<{ strikeCount: number; terminated: boolean }>(`${SESSIONS_BASE}/${sessionId}/strike`, { method: 'POST', body: JSON.stringify({ eventType, details }) }),
};
