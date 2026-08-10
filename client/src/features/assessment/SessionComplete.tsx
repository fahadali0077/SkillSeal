import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, CheckCheck, ArrowUpRight, Loader2 } from 'lucide-react';
import type { SkillTier } from '@SkillSeal/shared';
import { API_ORIGIN, apiFetch } from '../../lib/apiBase';
import SealMark from '../../components/SealMark';

interface ScoreBreakdown { compositeScore: number; conceptScore: number; speedScore: number; consistencyScore: number; behaviorScore: number; aiScore: number; aiProbability: number; }
interface SessionReport { sessionId: string; status: string; finalTier: SkillTier | null; scores: ScoreBreakdown; verificationId: string | null; durationMs: number; completedAt: string; retakeAfterDays: number; }
export interface Props { sessionId: string; skillName: string; declaredTier: SkillTier; certificateId?: string; onReset: () => void; initialData?: SessionReport; }

const PASS = '#1D7A4C';
const WARN = '#A8710F';
const FAIL = '#A3221B';

function useCountUp(target: number, durationMs = 900, enabled = false): number {
  const [value, setValue] = useState(0); const rafRef = useRef<number>(0);
  useEffect(() => { if (!enabled || target === 0) { setValue(0); return; } const start = performance.now(); const tick = (now: number) => { const pct = Math.min((now - start) / durationMs, 1); setValue(Math.round((1 - Math.pow(1 - pct, 3)) * target)); if (pct < 1) rafRef.current = requestAnimationFrame(tick); }; rafRef.current = requestAnimationFrame(tick); return () => cancelAnimationFrame(rafRef.current); }, [target, durationMs, enabled]);
  return value;
}

/** A measured reading with a hairline bar. No rainbow — only status is coloured. */
function Reading({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-ink-300">{label}</span>
        <span className="font-mono text-sm tabular-nums" style={{ color: tone ?? '#FBF9F6' }}>{value}</span>
      </div>
      <div className="h-px bg-ink-700 mt-2 overflow-hidden">
        <motion.div
          className="h-full"
          style={{ background: tone ?? '#7C8DA1' }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        />
      </div>
    </div>
  );
}

function RetakeCountdown({ days }: { days: number }) {
  const end = useRef(Date.now() + days * 86400000); const [label, setLabel] = useState('');
  useEffect(() => { const tick = () => { const diff = end.current - Date.now(); if (diff <= 0) { setLabel('now'); return; } const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000); setLabel(d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`); }; tick(); const id = setInterval(tick, 60000); return () => clearInterval(id); }, []);
  return <span className="font-mono text-[11px] tracking-[0.06em] uppercase text-ink-300 tabular-nums">Retake opens in {label}</span>;
}

export default function SessionComplete({ sessionId, skillName, declaredTier, certificateId: propCertId, onReset, initialData }: Props) {
  const [report, setReport] = useState<SessionReport | null>(initialData ?? null); const [certId, setCertId] = useState(propCertId ?? ''); const [fetchErr, setFetchErr] = useState(''); const [loading, setLoading] = useState(!initialData);
  const [idCopied, setIdCopied] = useState(false); const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    if (initialData) return; let cancelled = false;
    // 12 retries with gentle backoff. Total budget: ~45s — enough for slow certificate issuance.
    const delays = [400, 800, 1200, 1600, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000];
    async function attempt(n: number): Promise<void> {
      try {
        // apiFetch handles auth headers + silent refresh on 401
        const data = await apiFetch<SessionReport>(`${API_ORIGIN}/api/v1/sessions/${sessionId}/report`);
        if (!cancelled) { setReport(data); setLoading(false); }
      } catch (e) {
        if (cancelled) return;
        const msg = (e as Error)?.message ?? '';
        // If user was logged out by apiFetch (refresh failed), surface that instead of retrying
        if (msg.includes('Session expired')) {
          setFetchErr('Your session expired. Please log in to view results from your profile.');
          setLoading(false);
          return;
        }
        if (n < delays.length) {
          setTimeout(() => { if (!cancelled) void attempt(n + 1); }, delays[n]);
        } else {
          setFetchErr('Your results are being finalized. Please check your profile in a moment.');
          setLoading(false);
        }
      }
    }
    void attempt(0);
    return () => { cancelled = true; };
  }, [sessionId]);

  const scores = report?.scores;
  const target = scores?.compositeScore ?? 0;
  const display = useCountUp(target, 900, !loading && !!scores);
  const passed = target >= 70;
  const partial = target >= 50 && target < 70;
  const flaggedPass = passed && (scores?.aiProbability ?? 0) > 0.5;
  const statusColor = flaggedPass ? WARN : passed ? PASS : partial ? WARN : FAIL;
  const tierLabel = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', expert: 'Expert' }[report?.finalTier ?? declaredTier] ?? 'Verified';
  const flagged = (scores?.aiProbability ?? 0) > 0.5;

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 flex flex-col items-center justify-center gap-3 px-6">
        <Loader2 size={22} className="animate-spin text-ink-300" />
        <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink-400">Computing your results</p>
      </div>
    );
  }

  if (fetchErr || !scores) {
    return (
      <div className="min-h-screen bg-ink-900 flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full">
          <p className="font-mono text-[10px] font-medium tracking-[0.14em] uppercase text-warn">Result pending</p>
          <h1 className="font-display text-[30px] leading-tight text-paper mt-4">Results temporarily unavailable</h1>
          <p className="text-sm leading-relaxed text-ink-300 mt-3">{fetchErr}</p>
          <Link to="/profile" onClick={onReset} className="inline-flex items-center gap-2 bg-paper text-ink-900 font-semibold text-sm px-5 py-3 rounded mt-7 hover:bg-ink-100 transition-colors">
            Go to profile <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    );
  }

  const READINGS = [
    { label: 'Concept accuracy', value: scores.conceptScore },
    { label: 'Response speed', value: scores.speedScore },
    { label: 'Consistency', value: scores.consistencyScore },
    { label: 'Integrity', value: scores.behaviorScore, tone: PASS },
    { label: 'AI authenticity', value: scores.aiScore, tone: flagged ? WARN : undefined },
  ];

  const publicUrl = `${window.location.origin}/verify/${report?.verificationId}`;
  const shownId = certId || report?.verificationId || '';
  const copyId = () => navigator.clipboard.writeText(shownId).then(() => { setIdCopied(true); setTimeout(() => setIdCopied(false), 2000); });
  const copyUrl = () => navigator.clipboard.writeText(publicUrl).then(() => { setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2000); });

  return (
    <div className="min-h-screen bg-ink-900 px-5 py-14">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-lg mx-auto"
      >
        {/* ── The verdict ─────────────────────────────────────────────── */}
        <p className="font-mono text-[10px] font-medium tracking-[0.14em] uppercase text-ink-400">
          {skillName} · <span className="capitalize">{declaredTier}</span>
        </p>

        <h1 className="font-display text-[40px] leading-none tracking-[-0.02em] text-paper mt-4">
          {flaggedPass ? 'Provisionally certified' : passed ? 'Certified' : 'Not certified'}
        </h1>

        <div className="flex items-baseline gap-3 mt-5 pb-6 border-b border-ink-700">
          <span className="font-mono text-[52px] leading-none tabular-nums" style={{ color: statusColor }}>{display}</span>
          <span className="font-mono text-base text-ink-400">/100</span>
          <span className="ml-auto font-mono text-[10px] font-medium tracking-[0.12em] uppercase" style={{ color: statusColor }}>
            {flaggedPass ? 'Under review' : passed ? `Sealed · ${tierLabel}` : 'Below threshold'}
          </span>
        </div>

        {/* ── The certificate, if one was issued ──────────────────────── */}
        {/* The examination was ink; what it produces is a paper document. */}
        {passed && shownId && (
          <div data-testid="cert-id" className="bg-paper-card border border-paper-rule rounded-2xl overflow-hidden mt-7 shadow-raised">
            <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-paper-line">
              <span className="label">Certificate of verification</span>
              <span
                className="font-mono text-[10px] tracking-[0.1em] uppercase"
                style={{ color: flaggedPass ? WARN : PASS }}
              >
                {flaggedPass ? 'Provisional' : 'Sealed'}
              </span>
            </div>

            <div className="px-5 py-6 flex items-start gap-4">
              <SealMark size={48} tone={flaggedPass ? 'ink' : 'seal'} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="label">For</p>
                <p className="font-display text-[26px] leading-none text-ink-900 mt-1.5">
                  {skillName}
                  <span className="text-base text-ink-500 ml-2.5 font-sans font-semibold">{tierLabel}</span>
                </p>

                <p className="label mt-5">Certificate ID</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <code className="font-mono text-[13px] tracking-[0.04em] text-ink-700 flex-1 truncate">{shownId}</code>
                  <button
                    onClick={copyId}
                    aria-label="Copy certificate ID"
                    className="p-1.5 rounded-sm text-ink-400 hover:text-ink-900 hover:bg-paper-sunk transition-colors"
                  >
                    {idCopied ? <CheckCheck size={14} className="text-pass" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-paper-sunk border-t border-paper-line flex items-center gap-3">
              <p className="font-mono text-[11px] tracking-[0.04em] text-ink-500 truncate flex-1">
                Verified · {publicUrl.replace(/^https?:\/\//, '')}
              </p>
              <button onClick={copyUrl} className="text-xs font-semibold text-seal-600 hover:text-seal-700 whitespace-nowrap">
                {urlCopied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          </div>
        )}

        {/* ── Score breakdown ─────────────────────────────────────────── */}
        <div className="mt-8">
          <p className="font-mono text-[10px] font-medium tracking-[0.14em] uppercase text-ink-400 mb-2">Score breakdown</p>
          <div className="divide-y divide-ink-700">
            {READINGS.map(r => <Reading key={r.label} {...r} />)}
          </div>
        </div>

        {flagged && (
          <p className="text-sm leading-relaxed text-warn mt-6 pt-5 border-t border-ink-700">
            This session was flagged for review — the written answers scored as likely AI-assisted.
            The credential stays provisional until a reviewer confirms it.
          </p>
        )}

        {/* ── Retake ──────────────────────────────────────────────────── */}
        {!passed && (
          <div className="mt-8 pt-6 border-t border-ink-700">
            <p className="text-[15px] leading-relaxed text-ink-200">
              {partial
                ? 'Close. A score of 70 or above issues a certificate at this tier — the attempt stays on your record either way.'
                : 'This attempt stays on your record. Sit it again once the cooldown ends, or try a lower tier.'}
            </p>
            <p className="mt-3"><RetakeCountdown days={report!.retakeAfterDays} /></p>
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 mt-9">
          <Link
            to="/profile"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 bg-paper text-ink-900 font-semibold text-sm px-6 py-3.5 rounded hover:bg-ink-100 transition-colors"
          >
            View profile <ArrowUpRight size={16} />
          </Link>
          <button onClick={onReset} className="text-sm font-semibold text-ink-400 hover:text-paper py-1 transition-colors">
            Back to assessments
          </button>
        </div>
      </motion.div>
    </div>
  );
}
