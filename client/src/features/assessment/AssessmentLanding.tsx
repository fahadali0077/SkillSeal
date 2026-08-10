import { useSEO } from '../../lib/useSEO';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ChevronRight, Clock, AlertTriangle, CheckCircle2,
  Monitor, Wifi, Eye, Loader2, ArrowLeft, Trophy, RefreshCw,
  XCircle, Star, BarChart2, ExternalLink, Trash2, Search, Sparkles,
} from 'lucide-react';
import type { SkillTier } from '@SkillSeal/shared';
import { useAssessmentStore } from './useAssessment';
import { assessmentApi, type ISkillOption, type IMyVerification } from './assessmentApi';
import ConfirmDialog from '../../components/ConfirmDialog';
import toast from 'react-hot-toast';

const TIERS = [
  { value: 'beginner'     as SkillTier, label: 'Beginner',     description: 'Foundational concepts',      time: '~25 min' },
  { value: 'intermediate' as SkillTier, label: 'Intermediate',  description: 'Real-world patterns',        time: '~30 min' },
  { value: 'advanced'     as SkillTier, label: 'Advanced',      description: 'Deep internals',             time: '~35 min' },
  { value: 'expert'       as SkillTier, label: 'Expert',        description: 'Architecture & scalability', time: '~40 min' },
];

const TIER_ORDER: SkillTier[] = ['beginner', 'intermediate', 'advanced', 'expert'];

// Stated as terms of examination, not as a warning toast. Same content —
// the register is what changed.
const CONDITIONS = [
  'The session runs full-screen. Leaving this tab is recorded.',
  'The clipboard is monitored; pasted answers are flagged.',
  'Three violations end the session. The attempt stays on your record.',
  'Answers are checked for AI assistance and reported to recruiters.',
];

// A plain instrument table replaces the emoji list.
const Q_DIST = [
  { type: 'Multiple choice', count: 14, time: '60s' },
  { type: 'Scenario',        count:  4, time: '120s' },
  { type: 'Written theory',  count:  2, time: '150s' },
];

// Tier escalates by weight and contrast, not by hue — this avoids the
// purple/amber rainbow the old badges fell into.
function tierColor(tier: string) {
  return {
    beginner:     'text-ink-400 bg-paper-sunk border-paper-line font-normal',
    intermediate: 'text-ink-500 bg-paper-sunk border-paper-rule font-medium',
    advanced:     'text-ink-800 bg-paper-card border-ink-300 font-semibold',
    expert:       'text-paper bg-ink-800 border-ink-800 font-semibold',
  }[tier] ?? 'text-ink-500 bg-paper-sunk border-paper-line';
}

function scoreColor(score: number) {
  return score >= 70 ? '#1D7A4C' : score >= 50 ? '#A8710F' : '#A3221B';
}

// ── Skill attempt card (certified or failed) ──────────────────────────────────
function VerifiedCard({ v, onRetake, onDelete, deleting }: {
  v: IMyVerification;
  onRetake: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const failed     = v.status === 'FAILED' || v.status === 'TERMINATED';
  const expired    = v.isExpired || v.status === 'EXPIRED';
  const flagged    = v.status === 'FLAGGED' || v.status === 'REVOKED';
  const verified   = v.isCertified && !expired && !flagged;
  const terminated = v.status === 'TERMINATED';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 flex items-center gap-4
        ${verified ? 'border-green-200 bg-green-50/50'
          : terminated ? 'border-red-200 bg-red-50/40'
          : failed ? 'border-amber-200 bg-amber-50/40'
          : 'border-gray-200 bg-gray-50'}`}
    >
      <span className="text-2xl shrink-0">{v.skillIcon}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">{v.skillName}</span>
          <span className={`text-[11px] font-semibold capitalize px-2 py-0.5 rounded-sm border ${tierColor(v.tier)}`}>
            {v.tier}
          </span>
          {verified   && <span className="text-[11px] text-green-600 font-medium flex items-center gap-0.5"><ShieldCheck size={11} /> Verified</span>}
          {expired    && !failed && <span className="text-[11px] text-amber-600 font-medium">Expired</span>}
          {flagged    && <span className="text-[11px] text-red-600 font-medium">Flagged</span>}
          {failed     && !terminated && <span className="text-[11px] text-amber-700 font-medium">Not certified</span>}
          {terminated && <span className="text-[11px] text-red-700 font-medium flex items-center gap-0.5"><XCircle size={11} /> Terminated</span>}
        </div>

        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1">
            <BarChart2 size={11} className="text-gray-400" />
            <span className="text-xs font-bold tabular-nums" style={{ color: scoreColor(v.compositeScore) }}>
              {v.compositeScore}/100
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {failed ? `Attempted ${new Date(v.issuedAt).toLocaleDateString()}`
              : expired ? `Expired ${new Date(v.expiresAt!).toLocaleDateString()}`
              : `Expires ${v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : '—'}`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {verified && v.verificationId && (
          <Link
            to={`/verify/${v.verificationId}`}
            className="text-[11px] flex items-center gap-1 text-brand hover:underline"
          >
            <ExternalLink size={11} /> View
          </Link>
        )}
        <button
          onClick={onRetake}
          className="flex items-center gap-1 text-[11px] font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw size={11} />
          {expired ? 'Renew' : failed ? 'Retry' : 'Upgrade'}
        </button>

        <button
          onClick={onDelete}
          disabled={deleting}
          title="Delete this attempt"
          className="flex items-center justify-center w-7 h-7 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
        </button>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AssessmentLanding() {
  useSEO({ title: 'Verify Your Skills', description: 'Take an AI-powered skill assessment and earn your SkillSeal badge.', canonical: '/assessment' });

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preSkillId = params.get('skillId');
  const preTier    = params.get('tier') as SkillTier | null;

  const [skills,         setSkills]         = useState<ISkillOption[]>([]);
  const [verifications,  setVerifications]  = useState<IMyVerification[]>([]);
  const [skillsLoading,  setSkillsLoading]  = useState(true);
  const [verifLoading,   setVerifLoading]   = useState(true);
  const [skillsError,    setSkillsError]    = useState<string | null>(null);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [skillSearch,    setSkillSearch]    = useState('');
  const [pendingDelete,  setPendingDelete]  = useState<IMyVerification | null>(null);

  const handleDeleteAttempt = (v: IMyVerification) => setPendingDelete(v);

  const confirmDelete = async () => {
    const v = pendingDelete;
    if (!v) return;
    const id = v.sessionId ?? v.verificationId;
    if (!id) return;
    setDeletingId(id);
    try {
      await assessmentApi.deleteAttempt(v.sessionId ?? id);
      setVerifications((prev) => prev.filter((x) => (x.sessionId ?? x.verificationId) !== id));
      toast.success(`${v.skillName} attempt deleted`);
    } catch (e) {
      toast.error((e as Error).message ?? 'Failed to delete. Try again.');
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  useEffect(() => {
    assessmentApi.fetchSkills()
      .then(d  => setSkills(d))
      .catch(e => setSkillsError(e.message ?? 'Failed to load skills'))
      .finally(() => setSkillsLoading(false));

    assessmentApi.fetchMyVerifications()
      .then(d  => setVerifications(d))
      .catch(() => setVerifications([]))
      .finally(() => setVerifLoading(false));
  }, []);

  const prefilledSkill = skills.find(s => s._id === preSkillId) ?? null;
  const [step,          setStep]  = useState<'skill' | 'tier' | 'preflight'>(
    prefilledSkill && preTier ? 'preflight' : prefilledSkill ? 'tier' : 'skill',
  );
  const [selectedSkill, setSkill] = useState<ISkillOption | null>(prefilledSkill);
  const [selectedTier,  setTier]  = useState<SkillTier | null>(preTier);
  const [agreed, setAgreed]       = useState(false);

  const startSession = useAssessmentStore(s => s.startSession);
  const status       = useAssessmentStore(s => s.status);
  const error        = useAssessmentStore(s => s.error);
  const isStarting   = status === 'starting';

  const handleStart = async () => {
    if (!selectedSkill || !selectedTier || !agreed) return;
    await startSession(selectedSkill._id, selectedSkill.name, selectedTier);
    navigate('/assessment/active');
  };

  // For each skill, find the best certified verification (skipping failed attempts)
  const verifMap = new Map<string, IMyVerification>();
  for (const v of verifications) {
    if (!v.isCertified) continue;
    const existing = verifMap.get(v.skillId);
    if (!existing || TIER_ORDER.indexOf(v.tier as SkillTier) > TIER_ORDER.indexOf(existing.tier as SkillTier)) {
      verifMap.set(v.skillId, v);
    }
  }

  const hasVerifications = verifications.length > 0;

  // Stats for the hero strip
  const certifiedCount = verifications.filter(v => v.isCertified && !v.isExpired && v.status === 'VERIFIED').length;
  const totalAttempts  = verifications.length;
  const avgScore = verifications.length > 0
    ? Math.round(verifications.reduce((s, v) => s + v.compositeScore, 0) / verifications.length)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* ── Compact gradient hero ──────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-paper-sunk text-white p-6 mb-6">
        <div className="relative z-10 flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Skill Verification</h1>
              <p className="text-white/80 text-sm">Earn verified badges through 20-question assessments</p>
            </div>
          </div>

          {/* Stats — only when user has attempts */}
          {hasVerifications && (
            <div className="flex gap-5 text-center">
              <div>
                <div className="text-2xl font-bold tabular-nums">{certifiedCount}</div>
                <div className="text-[11px] text-white/70 uppercase tracking-wide">Certified</div>
              </div>
              <div className="w-px bg-white/20" />
              <div>
                <div className="text-2xl font-bold tabular-nums">{totalAttempts}</div>
                <div className="text-[11px] text-white/70 uppercase tracking-wide">Attempts</div>
              </div>
              <div className="w-px bg-white/20" />
              <div>
                <div className="text-2xl font-bold tabular-nums">{avgScore}</div>
                <div className="text-[11px] text-white/70 uppercase tracking-wide">Avg score</div>
              </div>
            </div>
          )}
        </div>
        {/* Decorative gradient orbs */}
        <div className="absolute -right-8 -top-12 w-44 h-44 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-44 h-44 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      </div>

      {/* ── Slim step indicator ───────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-1.5 mb-6">
        {['Skill', 'Tier', 'Review'].map((label, i) => {
          const stepId = (['skill', 'tier', 'preflight'] as const)[i];
          const active = step === stepId;
          const done   = (['skill', 'tier', 'preflight'] as const).indexOf(step) > i;
          return (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors
                ${done ? 'bg-green-500 text-white' : active ? 'bg-brand text-white' : 'bg-gray-100 text-gray-400'}`}>
                {done ? <CheckCircle2 size={11} /> : i + 1}
              </div>
              <span className={`text-xs ${active ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>{label}</span>
              {i < 2 && <ChevronRight size={12} className="text-gray-300" />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">

        {/* ── STEP 1: SKILL ──────────────────────────────────────────── */}
        {step === 'skill' && (
          <motion.div key="skill" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className={`grid gap-5 ${hasVerifications ? 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]' : 'grid-cols-1 max-w-2xl mx-auto'}`}>

            {/* My Skill Attempts (LEFT — stats panel) */}
            {hasVerifications && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 h-fit">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Trophy size={15} className="text-amber-500" />
                    </div>
                    <h2 className="font-semibold text-gray-900 text-sm">My Skill Attempts</h2>
                  </div>
                  <span className="text-xs text-gray-400">{totalAttempts}</span>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-[600px] overflow-y-auto pr-1 -mr-1">
                  {verifications.map((v) => {
                    const id = v.sessionId ?? v.verificationId ?? v.skillId;
                    return (
                      <VerifiedCard
                        key={id}
                        v={v}
                        deleting={deletingId === id}
                        onRetake={() => {
                          const skill = skills.find(s => s._id === v.skillId);
                          if (skill) { setSkill(skill); setStep('tier'); }
                        }}
                        onDelete={() => handleDeleteAttempt(v)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Verify a new skill (RIGHT — primary CTA) */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
                    <Sparkles size={15} className="text-brand" />
                  </div>
                  <h2 className="font-semibold text-gray-900 text-sm">
                    {hasVerifications ? 'Verify a new skill' : 'Choose a skill to verify'}
                  </h2>
                </div>
                {!skillsLoading && <span className="text-xs text-gray-400">{skills.length} available</span>}
              </div>

              {/* Search input */}
              {!skillsLoading && !skillsError && skills.length > 5 && (
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder="Search skills…"
                    className="w-full pl-9 pr-9 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10 transition-all"
                  />
                  {skillSearch && (
                    <button
                      onClick={() => setSkillSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <XCircle size={14} />
                    </button>
                  )}
                </div>
              )}

              {skillsLoading && (
                <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                  <Loader2 size={20} className="animate-spin" /> Loading skills…
                </div>
              )}
              {skillsError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{skillsError}</div>
              )}
              {!skillsLoading && !skillsError && (() => {
                const q = skillSearch.trim().toLowerCase();
                const filtered = q
                  ? skills.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
                  : skills;
                if (filtered.length === 0) {
                  return (
                    <div className="py-10 text-center text-sm text-gray-400">
                      No skills match "<span className="text-gray-700 font-medium">{skillSearch}</span>"
                    </div>
                  );
                }
                return (
                <div className="grid grid-cols-1 gap-2 max-h-[600px] overflow-y-auto pr-1 -mr-1">
                  {filtered.map(skill => {
                    const bestVerif = verifMap.get(skill._id);
                    const verified  = bestVerif && !bestVerif.isExpired && bestVerif.status === 'VERIFIED';
                    return (
                      <button
                        key={skill._id}
                        onClick={() => { setSkill(skill); setStep('tier'); }}
                        className={`group flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                          ${selectedSkill?._id === skill._id
                            ? 'border-brand bg-blue-50 ring-2 ring-brand/10'
                            : 'border-gray-200 hover:border-brand/40 hover:bg-gray-50'}`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0 group-hover:bg-white transition-colors">
                          {skill.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm">{skill.name}</p>
                            {verified && (
                              <span className={`text-[10px] font-bold capitalize px-1.5 py-0.5 rounded border ${tierColor(bestVerif!.tier)}`}>
                                ✓ {bestVerif!.tier}
                              </span>
                            )}
                            {bestVerif && bestVerif.isExpired && (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                Expired
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 capitalize">{skill.category}</p>
                        </div>
                        <ChevronRight size={15} className="text-gray-300 group-hover:text-brand transition-colors shrink-0" />
                      </button>
                    );
                  })}
                </div>
                );
              })()}
            </div>

            </div>
          </motion.div>
        )}

        {/* ── STEP 2: TIER ───────────────────────────────────────────── */}
        {step === 'tier' && (
          <motion.div key="tier" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep('skill')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                <ArrowLeft size={14} />Back
              </button>
              <h2 className="font-semibold text-gray-900">
                Select tier for <span className="text-brand">{selectedSkill?.name}</span>
              </h2>
            </div>

            {/* Show current status for this skill */}
            {selectedSkill && (() => {
              const skillVerifs = verifications.filter(v => v.skillId === selectedSkill._id);
              if (skillVerifs.length === 0) return null;
              return (
                <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Your current badges for {selectedSkill.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {skillVerifs.map(v => (
                      <span key={v.verificationId} className={`text-[11px] font-semibold capitalize px-2.5 py-1 rounded-sm border ${
                        v.isExpired ? 'text-gray-400 bg-gray-100 border-gray-200 line-through' : tierColor(v.tier)
                      }`}>
                        {v.isExpired ? '⚠️' : '✓'} {v.tier} · {v.compositeScore}/100
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="grid gap-3">
              {TIERS
                .filter(tier => !selectedSkill || selectedSkill.availableTiers.includes(tier.value))
                .map(tier => {
                  const existing = verifications.find(v => v.skillId === selectedSkill?._id && v.tier === tier.value);
                  const isVerified = existing && !existing.isExpired && existing.status === 'VERIFIED';
                  const isExpired  = existing?.isExpired;

                  return (
                    <button
                      key={tier.value}
                      onClick={() => { setTier(tier.value); setStep('preflight'); }}
                      className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all
                        ${selectedTier === tier.value ? 'border-brand bg-blue-50' : 'border-gray-200 hover:border-brand/50'}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 capitalize">{tier.label}</p>
                          {isVerified && (
                            <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-sm">
                              ✓ Verified · {existing!.compositeScore}/100
                            </span>
                          )}
                          {isExpired && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-sm">
                              Expired — Renew
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{tier.description}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={11} />{tier.time}
                      </div>
                    </button>
                  );
                })}
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: PREFLIGHT ──────────────────────────────────────── */}
        {step === 'preflight' && selectedSkill && selectedTier && (
          <motion.div key="preflight" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setStep('tier')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900 transition-colors">
                <ArrowLeft size={15} />Back
              </button>
              <span className="label">Step 3 of 3 · Review</span>
            </div>

            {/* The declaration itself — the one elevated object on this page. */}
            <div className="card-raised p-6 sm:p-7">
              <p className="label">You are about to sit</p>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-3">
                <h2 className="font-display text-[34px] leading-none text-ink-900">{selectedSkill.name}</h2>
                <span className="text-lg font-semibold text-ink-500 capitalize">{selectedTier} tier</span>
              </div>
              {(() => {
                const prev = verifications.find(v => v.skillId === selectedSkill._id && v.tier === selectedTier);
                if (!prev) return null;
                return (
                  <p className="mt-3 font-mono text-[11px] tracking-[0.06em] uppercase text-ink-400 flex items-center gap-1.5">
                    <RefreshCw size={12} />
                    {prev.isExpired
                      ? `Renewing lapsed credential · was ${prev.compositeScore}/100`
                      : `Upgrading · was ${prev.compositeScore}/100`}
                  </p>
                );
              })()}

              {/* Instrument */}
              <div className="mt-7 pt-5 border-t border-paper-line">
                <p className="label mb-3">Instrument · 20 questions</p>
                <table className="w-full">
                  <tbody className="divide-y divide-paper-line">
                    {Q_DIST.map(q => (
                      <tr key={q.type}>
                        <td className="py-2.5 text-sm text-ink-700">{q.type}</td>
                        <td className="py-2.5 text-right font-mono text-sm text-ink-900 tabular-nums whitespace-nowrap">
                          {q.count} × {q.time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Conditions of examination */}
              <div className="mt-6 pt-5 border-t border-paper-line">
                <p className="label mb-3">Conditions of examination</p>
                <ul className="space-y-2.5">
                  {CONDITIONS.map((c, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-700">
                      <span className="font-mono text-[11px] text-ink-400 tabular-nums pt-0.5 shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              <label className="flex items-start gap-3 mt-7 pt-5 border-t border-paper-line cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 accent-seal-600 shrink-0"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                />
                <span className="text-sm leading-relaxed text-ink-700">
                  I confirm I am sitting this assessment independently and without assistance.
                </span>
              </label>
            </div>

            {error && (
              <div className="p-3.5 bg-fail-tint border border-fail-line rounded text-sm text-fail">{error}</div>
            )}

            <button
              onClick={handleStart}
              disabled={!agreed || isStarting}
              className="btn-seal w-full py-3.5 text-base"
            >
              {isStarting
                ? <><Loader2 size={18} className="animate-spin" />Preparing…</>
                : 'Begin monitored session'}
            </button>
          </motion.div>
        )}

      </AnimatePresence>

      <ConfirmDialog
        open={!!pendingDelete}
        variant="danger"
        title={`Delete ${pendingDelete?.isCertified ? 'verification' : 'attempt'}?`}
        message={pendingDelete
          ? pendingDelete.isCertified
            ? `Your ${pendingDelete.skillName} ${pendingDelete.tier} certificate and badge will be permanently removed.`
            : `This ${pendingDelete.skillName} ${pendingDelete.tier} attempt will be removed from your history.`
          : ''}
        confirmLabel="Delete"
        loading={!!deletingId}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
