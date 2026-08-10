import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useSessionAudit } from './recruiterApi';

const DIFF_NUM: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

const INK = '#23384F';
const PASS = '#1D7A4C';
const FAIL = '#A3221B';
const LINE = '#E6E0D6';

function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

/** A labelled reading. Everything measured is mono and tabular. */
function Reading({ label, value, tone = 'text-ink-900' }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <span className="text-sm text-ink-500">{label}</span>
      <span className={`font-mono text-sm tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline text-sm">
        <span className="text-ink-500">{label}</span>
        <span className="font-mono text-ink-900 tabular-nums">{value}</span>
      </div>
      <div className="h-0.5 bg-paper-line overflow-hidden">
        <div className="h-full bg-ink-800" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export default function SessionAuditDrawer({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const { data: audit, isLoading } = useSessionAudit(sessionId);
  const diffData = audit?.answers.map((a, i) => ({ q: i + 1, difficulty: DIFF_NUM[a.difficulty] ?? 2, isCorrect: a.isCorrect })) ?? [];

  const tabSwitches = audit?.events.filter(e => e.eventType === 'tab-switch').length ?? 0;
  const pasteAttempts = audit?.events.filter(e => e.eventType === 'paste-attempt').length ?? 0;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
      >
        <div className="flex-1 bg-ink-950/40" onClick={onClose} />

        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          className="w-full max-w-2xl bg-paper border-l border-paper-rule shadow-pop flex flex-col h-full overflow-hidden"
          role="dialog"
          aria-label="Session audit"
        >
          <header className="flex items-start justify-between gap-4 px-6 py-4 border-b border-paper-rule bg-paper-card shrink-0">
            <div>
              <h2 className="font-display text-[22px] leading-none text-ink-900">Session audit</h2>
              {audit && (
                <p className="credential-id mt-2">
                  {audit.session.skillName} · declared {audit.session.declaredTier} · {audit.session._id.slice(0, 8).toUpperCase()}
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-paper-sunk text-ink-400 hover:text-ink-900 transition-colors" aria-label="Close">
              <X size={18} />
            </button>
          </header>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-ink-300"><Loader2 size={24} className="animate-spin" /></div>
          ) : !audit ? (
            <div className="flex-1 flex items-center justify-center px-6 text-center">
              <p className="text-sm text-ink-500">This audit isn’t available. The session may have been deleted.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {/* ── Integrity record ─────────────────────────────────── */}
              <section>
                <p className="label mb-1">Integrity record</p>
                <div className="divide-y divide-paper-line">
                  <Reading label="Duration" value={fmtDuration(audit.session.durationMs)} />
                  <Reading label="Tab switches" value={tabSwitches} tone={tabSwitches > 0 ? 'text-warn' : 'text-ink-900'} />
                  <Reading label="Paste attempts" value={pasteAttempts} tone={pasteAttempts > 0 ? 'text-warn' : 'text-ink-900'} />
                  <Reading label="Violations" value={`${audit.session.strikeCount} of 3`} tone={audit.session.strikeCount > 0 ? 'text-fail' : 'text-ink-900'} />
                  <Reading
                    label="AI-assist estimate"
                    value={`${Math.round(audit.session.aiProbability * 100)}%`}
                    tone={audit.session.aiProbability > 0.4 ? 'text-fail' : 'text-pass'}
                  />
                </div>
              </section>

              {/* ── Composite ────────────────────────────────────────── */}
              <section>
                <div className="flex items-baseline justify-between gap-4 mb-4">
                  <p className="label">Score breakdown</p>
                  <p>
                    <span className="font-mono text-3xl leading-none text-ink-900 tabular-nums">{audit.session.compositeScore}</span>
                    <span className="font-mono text-xs text-ink-400">/100</span>
                  </p>
                </div>
                <div className="space-y-3.5">
                  <ScoreBar label="Concept accuracy" value={audit.session.conceptScore} />
                  <ScoreBar label="Speed" value={audit.session.speedScore} />
                  <ScoreBar label="Consistency" value={audit.session.consistencyScore} />
                  <ScoreBar label="Integrity" value={audit.session.behaviorScore} />
                  <ScoreBar label="Authenticity" value={audit.session.aiScore} />
                </div>
              </section>

              {/* ── Difficulty curve ─────────────────────────────────── */}
              <section>
                <p className="label mb-3">Adaptive difficulty curve</p>
                <div className="border border-paper-line bg-paper-card p-3 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={diffData}>
                      <CartesianGrid strokeDasharray="2 3" stroke={LINE} vertical={false} />
                      <XAxis dataKey="q" tick={{ fontSize: 10, fill: '#7C8DA1', fontFamily: 'JetBrains Mono' }} stroke={LINE} />
                      <YAxis
                        domain={[0.5, 3.5]}
                        ticks={[1, 2, 3]}
                        tickFormatter={v => ['', 'BEG', 'MID', 'ADV'][v] ?? ''}
                        tick={{ fontSize: 10, fill: '#7C8DA1', fontFamily: 'JetBrains Mono' }}
                        stroke={LINE}
                      />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, border: `1px solid ${LINE}`, fontFamily: 'JetBrains Mono' }} />
                      <Line
                        dataKey="difficulty"
                        stroke={INK}
                        strokeWidth={1.5}
                        dot={(p) => {
                          const { cx, cy, payload } = p;
                          return (
                            <circle
                              key={`d${payload.q}`}
                              cx={cx} cy={cy} r={3.5}
                              fill={payload.isCorrect ? PASS : payload.isCorrect === false ? FAIL : '#94A6BA'}
                              stroke="#FBF9F6"
                              strokeWidth={1.5}
                            />
                          );
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* ── Answer detail ────────────────────────────────────── */}
              <section>
                <p className="label mb-3">Answer detail</p>
                <div className="overflow-x-auto border border-paper-line">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-paper-sunk border-b border-paper-line">
                        {['#', 'Type', 'Difficulty', 'Result', 'Time', 'Concept', 'AI'].map(h => (
                          <th key={h} className="text-left px-3 py-2 label">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-paper-line bg-paper-card">
                      {audit.answers.map((a, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-mono text-ink-400 tabular-nums">{String(i + 1).padStart(2, '0')}</td>
                          <td className="px-3 py-2 capitalize text-ink-700">{a.questionType.replace('-', ' ')}</td>
                          <td className="px-3 py-2 capitalize text-ink-500">{a.difficulty}</td>
                          <td className="px-3 py-2 font-mono text-[10px] tracking-[0.08em] uppercase">
                            {a.isCorrect === null
                              ? <span className="text-ink-400">—</span>
                              : a.isCorrect
                                ? <span className="text-pass">Pass</span>
                                : <span className="text-fail">Fail</span>}
                            {a.isTimeout && <span className="text-warn ml-1.5">TO</span>}
                          </td>
                          <td className="px-3 py-2 font-mono text-ink-600 tabular-nums">{(a.timeTaken / 1000).toFixed(1)}s</td>
                          <td className={`px-3 py-2 font-mono tabular-nums ${a.conceptScore >= 70 ? 'text-pass' : 'text-fail'}`}>{a.conceptScore}</td>
                          <td className="px-3 py-2 font-mono tabular-nums">
                            {a.questionType === 'micro-theory'
                              ? <span className={a.aiScore > 40 ? 'text-fail' : 'text-ink-400'}>{a.aiScore}%</span>
                              : <span className="text-ink-400">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ── Event log ────────────────────────────────────────── */}
              {audit.events.length > 0 && (
                <section>
                  <p className="label mb-3">Behaviour event log</p>
                  <ul className="divide-y divide-paper-line border border-paper-line bg-paper-card">
                    {audit.events.map((e, i) => (
                      <li key={i} className="flex items-center gap-4 px-3 py-2.5">
                        <span className="font-mono text-[11px] tracking-[0.04em] text-ink-400 tabular-nums shrink-0">
                          {new Date(e.timestamp).toISOString().slice(11, 19)}
                        </span>
                        <span className="text-xs text-ink-700 capitalize flex-1">{e.eventType.replace(/-/g, ' ')}</span>
                        <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-fail shrink-0">
                          Strike {e.strikeCount}/3
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
