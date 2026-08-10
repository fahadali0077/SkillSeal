import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import MCQQuestion from './MCQQuestion';
import ScenarioQuestion from './ScenarioQuestion';
import MicroTheoryQuestion from './MicroTheoryQuestion';
import TimerBar from './TimerBar';
import StrikeWarning from './StrikeWarning';
import SessionTerminated from './SessionTerminated';
import SessionComplete from './SessionComplete';
import SealMark from '../../components/SealMark';
import { useAssessmentStore, useTimeRemaining, useStrikeCount, useSessionResult, useAssessmentStatus, useCurrentQuestion, timerIntervalRef } from './useAssessment';
import { on, SOCKET_EVENTS } from '../../lib/socketClient';
import { API_ORIGIN } from '../../lib/apiBase';
import { useAuthStore } from '../auth/useAuth';

function stopTimer_() { if (timerIntervalRef.current !== null) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; } }
const STRIKE_COOLDOWN_MS = 2000;

/** Elapsed wall clock for the footer's focus-held reading. */
function useElapsed(active: boolean) {
  const startRef = useRef<number>(Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [active]);
  const s = Math.max(0, Math.floor((now - startRef.current) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Owns the viewport for every assessment state, including the result and the
 * termination screen. Anything rendered outside this would fall into normal
 * document flow behind the app shell.
 */
function SessionShell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div
      className="fixed inset-0 z-[9000] overflow-y-auto overscroll-contain bg-ink-900"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {children}
    </div>
  );
}

/** Stops the page behind the overlay from scrolling underneath it. */
function useBodyScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
}

export default function IsolationMode() {
  useBodyScrollLock();
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
  // HIGH-11: track when the tab actually went hidden so we can report the
  // real duration to the server instead of the hardcoded 0.
  const hiddenAtRef = useRef<number | null>(null);
  const isActiveSession = status === 'active' || status === 'submitting';
  const focusHeld = useElapsed(isActiveSession);
  void result;

  const fireStrike = useCallback((eventType: string, durationMs = 0) => {
    if (!isActiveSession) return;
    const now = Date.now(); if (now - lastStrikeRef.current < STRIKE_COOLDOWN_MS) return;
    lastStrikeRef.current = now; void handleAntiCheatEvent(eventType, null, durationMs);
  }, [handleAntiCheatEvent, isActiveSession]);

  useEffect(() => {
    if (!isActiveSession) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // HIGH-11: stamp the time the tab went hidden. We don't fire the
        // strike here — we wait until visibility returns so we can report
        // the actual hidden duration.
        hiddenAtRef.current = Date.now();
      } else if (document.visibilityState === 'visible' && hiddenAtRef.current !== null) {
        const elapsed = Date.now() - hiddenAtRef.current;
        hiddenAtRef.current = null;
        fireStrike('tab-switch', elapsed);
      }
    };
    const onBlur = () => fireStrike('window-blur');
    const blockPaste = (e: ClipboardEvent) => { e.preventDefault(); e.stopPropagation(); fireStrike('paste-attempt'); };
    const blockCtx = (e: MouseEvent) => e.preventDefault();
    // HIGH-15: block keyboard shortcuts that would let the user copy/select/
    // view source on the page during a monitored assessment.
    const blockKeys = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && (e.key === 'c' || e.key === 'C')) { e.preventDefault(); fireStrike('copy-attempt'); }
      else if (isMod && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); fireStrike('select-all-attempt'); }
      else if (isMod && (e.key === 'u' || e.key === 'U')) { e.preventDefault(); fireStrike('view-source-attempt'); }
    };
    document.addEventListener('visibilitychange', onVisibility); window.addEventListener('blur', onBlur);
    document.addEventListener('paste', blockPaste, true); document.addEventListener('contextmenu', blockCtx);
    document.addEventListener('keydown', blockKeys, true);
    return () => { document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('blur', onBlur); document.removeEventListener('paste', blockPaste, true); document.removeEventListener('contextmenu', blockCtx); document.removeEventListener('keydown', blockKeys, true); };
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
        }).catch((): null => null); // best-effort
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

  // The terminal states stay inside the overlay. Returning them bare put them
  // in normal document flow at the App level, which left the app shell — topbar,
  // empty page, mobile nav — sitting underneath the result and visible on scroll.
  if (status === 'terminated') {
    return (
      <SessionShell label="Session terminated">
        <SessionTerminated onReset={resetAssessment} />
      </SessionShell>
    );
  }
  if (status === 'completed') {
    return (
      <SessionShell label="Session complete">
        <SessionComplete
          sessionId={sessionId_c ?? ''}
          skillName={skillName ?? 'Assessment'}
          declaredTier={(tier ?? 'intermediate') as import('@SkillSeal/shared').SkillTier}
          onReset={resetAssessment}
        />
      </SessionShell>
    );
  }

  const isLoading = status === 'starting' || (status === 'submitting' && !currentQuestion);
  const qIndex = (sessionState?.currentQuestionIndex ?? 0) + 1;

  return (
    // The session drops to ink and loses all app chrome. There is nothing to
    // click here except the answer.
    <div
      className="fixed inset-0 z-[9000] bg-ink-900 text-paper flex flex-col overflow-hidden selection:bg-seal-600 selection:text-paper"
      role="application"
      aria-label="Assessment in progress"
      aria-modal="true"
    >
      <StrikeWarning strikeCount={strikeCount} />

      {/* ── Examination header ─────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-ink-700 px-5 sm:px-8 py-3.5 flex items-center gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <SealMark size={20} tone="seal" />
          <span className="font-display text-[17px] leading-none text-paper truncate">
            {skillName ?? 'Assessment'}
          </span>
          {tier && (
            <span className="hidden sm:inline font-mono text-[10px] tracking-[0.12em] uppercase text-ink-300 border border-ink-700 rounded-sm px-1.5 py-1">
              {tier}
            </span>
          )}
        </div>

        <div className="flex-1" />

        {sessionState && (
          <div className="flex items-baseline gap-1 font-mono text-sm tabular-nums">
            <span className="text-[10px] tracking-[0.12em] uppercase text-ink-400 mr-1">Q</span>
            <span className="text-paper">{String(qIndex).padStart(2, '0')}</span>
            <span className="text-ink-400">/ {sessionState.totalQuestions}</span>
          </div>
        )}

        {/* Strikes read as three struck marks, not traffic lights. */}
        <div className="hidden sm:flex items-center gap-1.5" aria-label={`${strikeCount} of 3 violations`}>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className={`w-4 h-0.5 ${i < strikeCount ? 'bg-fail' : 'bg-ink-700'}`}
            />
          ))}
        </div>

        <div className="w-32 sm:w-44">
          <TimerBar timeLimitMs={currentQuestion?.timeLimitMs ?? 60000} timeRemainingMs={timeRemainingMs} />
        </div>
      </div>

      {/* ── The question ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-10">
        <div className="flex min-h-full items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-ink-400">
              <Loader2 size={24} className="animate-spin text-ink-300" />
              <p className="font-mono text-[11px] tracking-[0.12em] uppercase">Loading next question</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {currentQuestion && (
                <motion.div
                  key={currentQuestion._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
                  className="w-full max-w-[720px]"
                >
                  {currentQuestion.questionType === 'mcq' && <MCQQuestion question={currentQuestion} onSubmit={s => void submitAnswer(s, '')} isSubmitting={status === 'submitting'} />}
                  {currentQuestion.questionType === 'scenario' && <ScenarioQuestion question={currentQuestion} onSubmit={s => void submitAnswer(s, '')} isSubmitting={status === 'submitting'} />}
                  {currentQuestion.questionType === 'micro-theory' && <MicroTheoryQuestion question={currentQuestion} onSubmit={t => void submitAnswer(null, t)} isSubmitting={status === 'submitting'} registerAutoSubmit={fn => { autoSubmitRef.current = fn; }} />}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── Monitoring record ──────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-ink-700 px-5 sm:px-8 py-2.5 flex items-center justify-center">
        <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-400 text-center">
          Session monitored
          <span className="mx-2 text-ink-700">·</span>
          {strikeCount} violation{strikeCount === 1 ? '' : 's'}
          <span className="mx-2 text-ink-700">·</span>
          tab focus held {focusHeld}
        </p>
      </div>
    </div>
  );
}
