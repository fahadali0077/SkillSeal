import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Loader2 } from 'lucide-react';
import MCQQuestion from './MCQQuestion';
import ScenarioQuestion from './ScenarioQuestion';
import MicroTheoryQuestion from './MicroTheoryQuestion';
import TimerBar from './TimerBar';
import StrikeWarning from './StrikeWarning';
import SessionTerminated from './SessionTerminated';
import SessionComplete from './SessionComplete';
import { useAssessmentStore, useTimeRemaining, useStrikeCount, useSessionResult, useAssessmentStatus, useCurrentQuestion, timerIntervalRef } from './useAssessment';
import { on, SOCKET_EVENTS } from '../../lib/socketClient';
import { API_ORIGIN } from '../../lib/apiBase';
import { useAuthStore } from '../auth/useAuth';
function stopTimer_() { if (timerIntervalRef.current !== null) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; } }
const STRIKE_COOLDOWN_MS = 2000;
export default function IsolationMode() {
  const status = useAssessmentStatus();
  const currentQuestion = useCurrentQuestion();
  const timeRemainingMs = useTimeRemaining();
  const strikeCount = useStrikeCount();
  const result = useSessionResult();
  const skillName = useAssessmentStore(s => s.skillName);
  const tier = useAssessmentStore(s => s.tier);
  const sessionState = useAssessmentStore(s => s.sessionState);
  const sessionId_c = useAssessmentStore(s => s.sessionId);
  const handleAntiCheatEvent = useAssessmentStore(s => s.handleAntiCheatEvent);
  const submitAnswer = useAssessmentStore(s => s.submitAnswer);
  const resetAssessment = useAssessmentStore(s => s.resetAssessment);
  const autoSubmitRef = useRef<(() => void) | null>(null);
  const lastStrikeRef = useRef<number>(0);
  const isActiveSession = status === 'active' || status === 'submitting';
  const fireStrike = useCallback((eventType: string) => {
    if (!isActiveSession) return;
    const now = Date.now(); if (now - lastStrikeRef.current < STRIKE_COOLDOWN_MS) return;
    lastStrikeRef.current = now; void handleAntiCheatEvent(eventType, null, 0);
  }, [handleAntiCheatEvent, isActiveSession]);
  useEffect(() => {
    if (!isActiveSession) return;
    const onVisibility = () => { if (document.visibilityState === 'hidden') fireStrike('tab-switch'); };
    const onBlur = () => fireStrike('window-blur');
    const blockPaste = (e: ClipboardEvent) => { e.preventDefault(); e.stopPropagation(); fireStrike('paste-attempt'); };
    const blockCtx = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('visibilitychange', onVisibility); window.addEventListener('blur', onBlur);
    document.addEventListener('paste', blockPaste, true); document.addEventListener('contextmenu', blockCtx);
    return () => { document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('blur', onBlur); document.removeEventListener('paste', blockPaste, true); document.removeEventListener('contextmenu', blockCtx); };
  }, [isActiveSession, fireStrike]);
  useEffect(() => {
    if (!isActiveSession) return;
    const handle = (e: BeforeUnloadEvent) => {
      // Show browser "leave page?" dialog
      e.preventDefault();
      e.returnValue = 'Your assessment is in progress. Leaving will terminate your session.';

      // Fire-and-forget abandon call using keepalive so it completes even as
      // the page unloads. The auth token is read from the Zustand store.
      const token = useAuthStore.getState().accessToken;
      const sessionId = useAssessmentStore.getState().sessionId;
      if (sessionId && token) {
        fetch(`${API_ORIGIN}/api/v1/sessions/abandon`, {
          method: 'POST',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        }).catch(() => null); // best-effort
      }

      return e.returnValue;
    };
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, [isActiveSession]);
  useEffect(() => {
    const off = on<{ action: string }>(SOCKET_EVENTS.SESSION_ACTION, ({ action }) => {
      if (action === 'terminate') { stopTimer_(); useAssessmentStore.setState({ status: 'terminated', isTerminated: true, currentQuestion: null }); }
    }); return off;
  }, []);
  if (status === 'terminated') return <SessionTerminated onReset={resetAssessment} />;
  if (status === 'completed') return <SessionComplete sessionId={sessionId_c ?? ''} skillName={skillName ?? 'Assessment'} declaredTier={(tier ?? 'intermediate') as import('@SkillSeal/shared').SkillTier} onReset={resetAssessment} />;
  const isLoading = status === 'starting' || (status === 'submitting' && !currentQuestion);
  return (
    <div className="fixed inset-0 z-[9000] bg-white flex flex-col overflow-hidden" role="application" aria-label="Assessment in progress">
      <StrikeWarning strikeCount={strikeCount} />
      <div className="shrink-0 border-b border-gray-100 bg-white px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-brand" /><span className="text-sm font-medium text-gray-600">{skillName ?? 'Assessment'}{tier && <span className="text-gray-400 ml-1 capitalize">| {tier} Level</span>}</span></div>
        <div className="flex-1" />
        {/* Question counter */}
        {sessionState && (
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
            <span className="text-brand font-bold">{sessionState.currentQuestionIndex + 1}</span>
            <span className="text-gray-300">/</span>
            <span>{sessionState.totalQuestions}</span>
          </div>
        )}
        {strikeCount > 0 && <div className="flex items-center gap-1.5">{[0, 1, 2].map(i => <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${i < strikeCount ? 'bg-red-500' : 'bg-gray-200'}`} />)}</div>}
        <div className="w-48"><TimerBar timeLimitMs={currentQuestion?.timeLimitMs ?? 60000} timeRemainingMs={timeRemainingMs} /></div>
      </div>
      <div className="flex-1 overflow-y-auto flex items-center justify-center px-6 py-10">
        {isLoading ? <div className="flex flex-col items-center gap-3 text-gray-400"><Loader2 size={28} className="animate-spin text-brand" /><p className="text-sm">Loading next question…</p></div> : (
          <AnimatePresence mode="wait">
            {currentQuestion && (
              <motion.div key={currentQuestion._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ type: 'spring', damping: 26, stiffness: 300 }} className="w-full max-w-[720px]">
                {currentQuestion.questionType === 'mcq' && <MCQQuestion question={currentQuestion} onSubmit={s => void submitAnswer(s, '')} isSubmitting={status === 'submitting'} />}
                {currentQuestion.questionType === 'scenario' && <ScenarioQuestion question={currentQuestion} onSubmit={s => void submitAnswer(s, '')} isSubmitting={status === 'submitting'} />}
                {currentQuestion.questionType === 'micro-theory' && <MicroTheoryQuestion question={currentQuestion} onSubmit={t => void submitAnswer(null, t)} isSubmitting={status === 'submitting'} registerAutoSubmit={fn => { autoSubmitRef.current = fn; }} />}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
      <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-6 py-2 flex justify-center">
        <p className="text-[11px] text-gray-400">This session is monitored. Tab switching, window blur, and clipboard events are recorded.</p>
      </div>
    </div>
  );
}
