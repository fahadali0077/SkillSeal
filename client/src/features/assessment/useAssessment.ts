import { create } from 'zustand';
import type { IQuestion, ISessionState, SkillTier } from '@SkillSeal/shared';
import { assessmentApi } from './assessmentApi';
import { emit, SOCKET_EVENTS } from '../../lib/socketClient';
export type AssessmentStatus = 'idle' | 'starting' | 'active' | 'submitting' | 'completed' | 'terminated' | 'error';
export interface AssessmentState {
  status: AssessmentStatus; sessionId: string | null; skillId: string | null; skillName: string | null; tier: SkillTier | null; currentQuestion: IQuestion | null; sessionState: ISessionState | null; result: unknown | null; error: string | null; timeRemainingMs: number; questionStartedAt: number; strikeCount: number; lastStrikeAction: string | null; isTerminated: boolean;
  setTimeRemaining: (ms: number) => void; startSession: (skillId: string, skillName: string, tier: SkillTier) => Promise<void>; submitAnswer: (selectedOption: string | null, textAnswer: string, isTimeout?: boolean) => Promise<void>; handleAntiCheatEvent: (eventType: string, questionId?: string | null, tabHiddenMs?: number) => Promise<void>; resetAssessment: () => void;
}
export const timerIntervalRef = { current: null as ReturnType<typeof setInterval> | null };
export const timeoutFiredRef = { current: false };
export const isSubmittingRef = { current: false };
export const lastEventTimeRef = { current: 0 };
const EVENT_DEBOUNCE_MS = 2000;
export const useAssessmentStore = create<AssessmentState>()((set, get) => ({
  status: 'idle', sessionId: null, skillId: null, skillName: null, tier: null, currentQuestion: null, sessionState: null, result: null, error: null, timeRemainingMs: 0, questionStartedAt: 0, strikeCount: 0, lastStrikeAction: null, isTerminated: false,
  setTimeRemaining: (ms) => set({ timeRemainingMs: ms }),
  startSession: async (skillId, skillName, tier) => {
    stopTimer(); isSubmittingRef.current = false; timeoutFiredRef.current = false;
    set({ status: 'starting', error: null, result: null, isTerminated: false, strikeCount: 0, lastStrikeAction: null });
    try {
      const { sessionId, firstQuestion, sessionState } = await assessmentApi.startSession(skillId, tier);
      const now = Date.now();
      set({ status: 'active', sessionId, skillId, skillName, tier, currentQuestion: firstQuestion, sessionState, timeRemainingMs: firstQuestion.timeLimitMs, questionStartedAt: now });
      startTimer(firstQuestion.timeLimitMs, () => get().submitAnswer(null, '', true));
      emit(SOCKET_EVENTS.JOIN_ROOM, `session:${sessionId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      // 409 means a previous session is still active — abandon it and retry once
      if (msg.includes('409') || msg.toLowerCase().includes('active session')) {
        try {
          await assessmentApi.abandonSession();
          const { sessionId, firstQuestion, sessionState } = await assessmentApi.startSession(skillId, tier);
          const now = Date.now();
          set({ status: 'active', sessionId, skillId, skillName, tier, currentQuestion: firstQuestion, sessionState, timeRemainingMs: firstQuestion.timeLimitMs, questionStartedAt: now });
          startTimer(firstQuestion.timeLimitMs, () => get().submitAnswer(null, '', true));
          emit(SOCKET_EVENTS.JOIN_ROOM, `session:${sessionId}`);
        } catch (retryErr) {
          set({ status: 'error', error: retryErr instanceof Error ? retryErr.message : 'Failed to start session' });
        }
      } else {
        set({ status: 'error', error: msg });
      }
    }
  },
  submitAnswer: async (selectedOption, textAnswer, isTimeout = false) => {
    if (isSubmittingRef.current) return;
    const { sessionId, currentQuestion } = get(); if (!sessionId || !currentQuestion) return;
    isSubmittingRef.current = true; stopTimer();
    const timeTaken = Math.min(currentQuestion.timeLimitMs, Date.now() - get().questionStartedAt);
    set({ status: 'submitting' });
    try {
      const r = await assessmentApi.submitAnswer(sessionId, currentQuestion._id, selectedOption, textAnswer, timeTaken, isTimeout, new Date().toISOString());
      isSubmittingRef.current = false; timeoutFiredRef.current = false;
      if (r.sessionComplete) { set({ status: 'completed', result: r.result ?? null, currentQuestion: null, sessionState: r.sessionState }); return; }
      if (r.nextQuestion) { const now = Date.now(); set({ status: 'active', currentQuestion: r.nextQuestion, sessionState: r.sessionState, timeRemainingMs: r.nextQuestion.timeLimitMs, questionStartedAt: now }); startTimer(r.nextQuestion.timeLimitMs, () => get().submitAnswer(null, '', true)); }
    } catch (err) { isSubmittingRef.current = false; set({ status: 'error', error: err instanceof Error ? err.message : 'Failed' }); }
  },
  handleAntiCheatEvent: async (eventType, questionId = null, tabHiddenMs = 0) => {
    const { sessionId, questionStartedAt } = get(); if (!sessionId) return;
    const now = Date.now(); if (now - lastEventTimeRef.current < EVENT_DEBOUNCE_MS) return;
    lastEventTimeRef.current = now;
    const timeOnQuestion = Math.max(0, now - questionStartedAt);
    if (eventType !== 'window-focus') set({ strikeCount: get().strikeCount + 1 });
    try {
      const r = await assessmentApi.logEvent(sessionId, eventType, questionId, timeOnQuestion, tabHiddenMs);
      set({ strikeCount: r.strikeCount, lastStrikeAction: r.action });
      if (r.action === 'terminate') { stopTimer(); set({ status: 'terminated', isTerminated: true, currentQuestion: null }); }
    } catch { }
  },
  resetAssessment: () => { stopTimer(); isSubmittingRef.current = false; timeoutFiredRef.current = false; set({ status: 'idle', sessionId: null, skillId: null, skillName: null, tier: null, currentQuestion: null, sessionState: null, result: null, error: null, timeRemainingMs: 0, questionStartedAt: 0, strikeCount: 0, lastStrikeAction: null, isTerminated: false }); },
}));
function startTimer(durationMs: number, onExpire: () => void): void {
  stopTimer(); timeoutFiredRef.current = false;
  const startedAt = Date.now(); const store = useAssessmentStore.getState();
  timerIntervalRef.current = setInterval(() => {
    const remaining = Math.max(0, durationMs - (Date.now() - startedAt));
    store.setTimeRemaining(remaining);
    if (remaining <= 0 && !timeoutFiredRef.current) { timeoutFiredRef.current = true; clearInterval(timerIntervalRef.current!); timerIntervalRef.current = null; onExpire(); }
  }, 100);
}
function stopTimer(): void { if (timerIntervalRef.current !== null) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; } }
export const useCurrentQuestion = () => useAssessmentStore(s => s.currentQuestion);
export const useAssessmentStatus = () => useAssessmentStore(s => s.status);
export const useTimeRemaining = () => useAssessmentStore(s => s.timeRemainingMs);
export const useStrikeCount = () => useAssessmentStore(s => s.strikeCount);
export const useSessionResult = () => useAssessmentStore(s => s.result);
export const useLastStrikeAction = () => useAssessmentStore(s => s.lastStrikeAction);
