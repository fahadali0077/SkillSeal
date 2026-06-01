import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Copy, CheckCheck, ExternalLink, ArrowRight, RefreshCw, Clock, Loader2, TrendingUp, AlertTriangle, Share2, Trophy } from 'lucide-react';
import type { SkillTier } from '@SkillSeal/shared';
import { API_ORIGIN, apiFetch } from '../../lib/apiBase';
interface ScoreBreakdown { compositeScore: number; conceptScore: number; speedScore: number; consistencyScore: number; behaviorScore: number; aiScore: number; aiProbability: number; }
interface SessionReport { sessionId: string; status: string; finalTier: SkillTier | null; scores: ScoreBreakdown; verificationId: string | null; durationMs: number; completedAt: string; retakeAfterDays: number; }
export interface Props { sessionId: string; skillName: string; declaredTier: SkillTier; certificateId?: string; onReset: () => void; initialData?: SessionReport; }
function useCountUp(target: number, durationMs = 1500, enabled = false): number {
  const [value, setValue] = useState(0); const rafRef = useRef<number>(0);
  useEffect(() => { if (!enabled || target === 0) { setValue(0); return; } const start = performance.now(); const tick = (now: number) => { const pct = Math.min((now - start) / durationMs, 1); setValue(Math.round((1 - Math.pow(1 - pct, 3)) * target)); if (pct < 1) rafRef.current = requestAnimationFrame(tick); }; rafRef.current = requestAnimationFrame(tick); return () => cancelAnimationFrame(rafRef.current); }, [target, durationMs, enabled]);
  return value;
}
function ScoreBar({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  return (<motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, type: 'spring', damping: 22 }} className="space-y-1.5">
    <div className="flex items-center justify-between text-sm"><span className="text-gray-300">{label}</span><span className="font-bold tabular-nums" style={{ color }}>{value}</span></div>
    <div className="h-2 bg-gray-800 rounded-full overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.9, ease: 'easeOut', delay: delay + 0.1 }} /></div>
  </motion.div>);
}
function RetakeCountdown({ days }: { days: number }) {
  const end = useRef(Date.now() + days * 86400000); const [label, setLabel] = useState('');
  useEffect(() => { const tick = () => { const diff = end.current - Date.now(); if (diff <= 0) { setLabel('now'); return; } const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000); setLabel(d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`); }; tick(); const id = setInterval(tick, 60000); return () => clearInterval(id); }, []);
  return <span className="flex items-center gap-1.5 text-sm text-gray-500"><Clock size={13} />Retake opens in <strong className="text-gray-300 ml-1">{label}</strong></span>;
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
  const scores = report?.scores; const target = scores?.compositeScore ?? 0; const display = useCountUp(target, 1500, !loading && !!scores);
  const passed = target >= 70; const partial = target >= 50 && target < 70; const statusColor = passed ? '#22c55e' : partial ? '#f59e0b' : '#ef4444';
  const R = 70, circ = 2 * Math.PI * R;
  const tierLabel = { beginner: 'Beginner', intermediate: 'Mid Level', advanced: 'Advanced', expert: 'Expert' }[report?.finalTier ?? declaredTier] ?? 'Verified';
  if (loading) return <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}><Loader2 size={40} className="text-brand" /></motion.div><p className="text-gray-400 text-sm">Computing your results…</p></div>;
  if (fetchErr || !scores) return <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-5 px-6 text-center"><AlertTriangle size={40} className="text-amber-400" /><p className="text-white font-semibold text-lg">Results temporarily unavailable</p><p className="text-gray-400 text-sm max-w-sm">{fetchErr}</p><Link to="/profile" onClick={onReset} className="flex items-center gap-2 bg-white text-gray-900 font-semibold px-5 py-2.5 rounded-xl">Go to profile <ArrowRight size={15} /></Link></div>;
  const BARS = [{ label: 'Concept accuracy', value: scores.conceptScore, color: '#3b82f6', delay: 0.30 }, { label: 'Response speed', value: scores.speedScore, color: '#8b5cf6', delay: 0.40 }, { label: 'Consistency', value: scores.consistencyScore, color: '#06b6d4', delay: 0.50 }, { label: 'Integrity', value: scores.behaviorScore, color: '#10b981', delay: 0.60 }, { label: 'AI authenticity', value: scores.aiScore, color: '#f59e0b', delay: 0.70 }];
  const publicUrl = `${window.location.origin}/verify/${report?.verificationId}`;
  const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}&title=${encodeURIComponent(`I earned a Verified ${tierLabel} ${skillName} badge on SkillSeal!`)}`;
  const copyId = () => navigator.clipboard.writeText(certId).then(() => { setIdCopied(true); setTimeout(() => setIdCopied(false), 2000); });
  const copyUrl = () => navigator.clipboard.writeText(publicUrl).then(() => { setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2000); });
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-5 py-12 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 24 }} className="w-full max-w-lg space-y-5">
        <div className="text-center space-y-3">
          <p className="text-gray-500 text-xs uppercase tracking-widest">{skillName} · <span className="capitalize">{declaredTier}</span></p>
          <div className="flex justify-center">
            <div className="relative inline-flex items-center justify-center">
              <svg width="168" height="168" viewBox="0 0 168 168" className="-rotate-90"><circle cx="84" cy="84" r={R} fill="none" stroke="#1f2937" strokeWidth="12" /><motion.circle cx="84" cy="84" r={R} fill="none" stroke={statusColor} strokeWidth="12" strokeLinecap="round" strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ * (1 - target / 100) }} transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }} /></svg>
              <div className="absolute flex flex-col items-center justify-center"><span className="text-4xl font-bold tabular-nums" style={{ color: statusColor }}>{display}</span><span className="text-gray-500 text-sm">/100</span></div>
            </div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: 'spring' }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border" style={{ background: `${statusColor}18`, borderColor: `${statusColor}40`, color: statusColor }}>
            {passed && <><ShieldCheck size={16} /><span className="font-bold text-sm">Verified — {tierLabel}</span></>}
            {partial && <><TrendingUp size={16} /><span className="font-bold text-sm">Almost there — {target}/100</span></>}
            {!passed && !partial && <><AlertTriangle size={16} /><span className="font-bold text-sm">Not certified — {target}/100</span></>}
          </motion.div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <p className="text-gray-600 text-xs uppercase tracking-wider font-semibold">Score breakdown</p>
          {BARS.map(b => <ScoreBar key={b.label} {...b} />)}
        </div>
        {passed && (certId || report?.verificationId) && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, type: 'spring', damping: 22 }} className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#1e3a5f 0%,#0a1628 100%)', border: '1px solid rgba(59,130,246,0.3)' }}>
            <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3"><ShieldCheck size={18} className="text-blue-400" /><div className="flex-1"><p className="text-blue-300 text-[11px] font-semibold uppercase tracking-wider">Verified Certificate</p><p className="text-white text-sm font-bold">{skillName} · <span className="capitalize">{tierLabel}</span></p></div><Trophy size={18} className="text-amber-400" /></div>
            <div className="px-5 py-4"><p className="text-gray-600 text-xs mb-1">Certificate ID</p><div className="flex items-center gap-2"><code className="font-mono text-sm text-blue-300 tracking-widest flex-1">{certId || report?.verificationId}</code><button onClick={copyId} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400">{idCopied ? <CheckCheck size={14} className="text-green-400" /> : <Copy size={14} />}</button></div></div>
            <div className="px-5 pb-4 flex gap-2">
              <button onClick={copyUrl} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-gray-300 py-2 rounded-xl">{urlCopied ? <><CheckCheck size={13} className="text-green-400" />Copied!</> : <><Share2 size={13} />Copy public link</>}</button>
              <a href={liUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-[#0a66c2] text-white py-2 rounded-xl"><ExternalLink size={13} />LinkedIn</a>
            </div>
          </motion.div>
        )}
        {!passed && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3"><p className="text-white font-semibold text-sm">{partial ? "You didn't quite make it — score 70+ to certify" : "Keep practising — you'll get there!"}</p><div className="flex items-center justify-between pt-1"><RetakeCountdown days={report!.retakeAfterDays} /><RefreshCw size={14} className="text-gray-700" /></div></motion.div>}
        <div className="flex flex-col gap-3 pt-1">
          <Link to="/profile" onClick={onReset} className="flex items-center justify-center gap-2 bg-white text-gray-900 font-semibold px-6 py-3 rounded-xl hover:bg-gray-100">View profile <ArrowRight size={16} /></Link>
          <button onClick={onReset} className="text-gray-600 hover:text-gray-400 text-sm py-1">Back to assessments</button>
        </div>
      </motion.div>
    </div>
  );
}
