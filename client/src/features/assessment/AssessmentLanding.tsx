import { useSEO } from '../../lib/useSEO';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ChevronRight, Clock, AlertTriangle, CheckCircle2,
  Monitor, Wifi, Eye, Loader2, ArrowLeft, Trophy, RefreshCw,
  XCircle, Star, BarChart2, ExternalLink,
} from 'lucide-react';
import type { SkillTier } from '@SkillSeal/shared';
import { useAssessmentStore } from './useAssessment';
import { assessmentApi, type ISkillOption, type IMyVerification } from './assessmentApi';

const TIERS = [
  { value: 'beginner' as SkillTier, label: 'Beginner', description: 'Foundational concepts', time: '~25 min' },
  { value: 'intermediate' as SkillTier, label: 'Intermediate', description: 'Real-world patterns', time: '~30 min' },
  { value: 'advanced' as SkillTier, label: 'Advanced', description: 'Deep internals', time: '~35 min' },
  { value: 'expert' as SkillTier, label: 'Expert', description: 'Architecture & scalability', time: '~40 min' },
];

const TIER_ORDER: SkillTier[] = ['beginner', 'intermediate', 'advanced', 'expert'];

const RULES = [
  { icon: <Monitor size={15} />, text: 'Stay on this tab throughout' },
  { icon: <Eye size={15} />, text: 'No copy-pasting — clipboard is monitored' },
  { icon: <Wifi size={15} />, text: 'Ensure stable internet connection' },
  { icon: <AlertTriangle size={15} />, text: '3 violations will terminate your session' },
];

const Q_DIST = [
  { type: 'Multiple Choice', count: 14, time: '60s each', icon: '📝' },
  { type: 'Scenario-based', count: 4, time: '120s each', icon: '🔍' },
  { type: 'Written theory', count: 2, time: '150s each', icon: '✍️' },
];

function tierColor(tier: string) {
  return { beginner: 'text-green-600 bg-green-50 border-green-200', intermediate: 'text-blue-600 bg-blue-50 border-blue-200', advanced: 'text-purple-600 bg-purple-50 border-purple-200', expert: 'text-amber-600 bg-amber-50 border-amber-200' }[tier] ?? 'text-gray-600 bg-gray-50 border-gray-200';
}

function scoreColor(score: number) {
  return score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
}

// ── Verified skill badge card ─────────────────────────────────────────────────
function VerifiedCard({ v, onRetake }: { v: IMyVerification; onRetake: () => void }) {
  const expired = v.isExpired || v.status === 'EXPIRED';
  const flagged = v.status === 'FLAGGED' || v.status === 'REVOKED';
  const verified = !expired && !flagged;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 flex items-center gap-4
        ${verified ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50'}`}
    >
      <span className="text-2xl shrink-0">{v.skillIcon}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">{v.skillName}</span>
          <span className={`text-[11px] font-semibold capitalize px-2 py-0.5 rounded-full border ${tierColor(v.tier)}`}>
            {v.tier}
          </span>
          {verified && <ShieldCheck size={13} className="text-green-600" />}
          {expired && <span className="text-[11px] text-amber-600 font-medium">Expired</span>}
          {flagged && <span className="text-[11px] text-red-600 font-medium">Flagged</span>}
        </div>

        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1">
            <BarChart2 size={11} className="text-gray-400" />
            <span className="text-xs font-bold tabular-nums" style={{ color: scoreColor(v.compositeScore) }}>
              {v.compositeScore}/100
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {expired ? `Expired ${new Date(v.expiresAt).toLocaleDateString()}` : `Expires ${new Date(v.expiresAt).toLocaleDateString()}`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {verified && (
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
          {expired ? 'Renew' : 'Upgrade'}
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
  const preTier = params.get('tier') as SkillTier | null;

  const [skills, setSkills] = useState<ISkillOption[]>([]);
  const [verifications, setVerifications] = useState<IMyVerification[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [verifLoading, setVerifLoading] = useState(true);
  const [skillsError, setSkillsError] = useState<string | null>(null);

  useEffect(() => {
    assessmentApi.fetchSkills()
      .then(d => setSkills(d))
      .catch(e => setSkillsError(e.message ?? 'Failed to load skills'))
      .finally(() => setSkillsLoading(false));

    assessmentApi.fetchMyVerifications()
      .then(d => setVerifications(d))
      .catch(() => setVerifications([]))
      .finally(() => setVerifLoading(false));
  }, []);

  const prefilledSkill = skills.find(s => s._id === preSkillId) ?? null;
  const [step, setStep] = useState<'skill' | 'tier' | 'preflight'>(
    prefilledSkill && preTier ? 'preflight' : prefilledSkill ? 'tier' : 'skill',
  );
  const [selectedSkill, setSkill] = useState<ISkillOption | null>(prefilledSkill);
  const [selectedTier, setTier] = useState<SkillTier | null>(preTier);
  const [agreed, setAgreed] = useState(false);

  const startSession = useAssessmentStore(s => s.startSession);
  const status = useAssessmentStore(s => s.status);
  const error = useAssessmentStore(s => s.error);
  const isStarting = status === 'starting';

  const handleStart = async () => {
    if (!selectedSkill || !selectedTier || !agreed) return;
    await startSession(selectedSkill._id, selectedSkill.name, selectedTier);
    navigate('/assessment/active');
  };

  // For each skill, find its best verification
  const verifMap = new Map<string, IMyVerification>();
  for (const v of verifications) {
    const existing = verifMap.get(v.skillId);
    if (!existing || TIER_ORDER.indexOf(v.tier as SkillTier) > TIER_ORDER.indexOf(existing.tier as SkillTier)) {
      verifMap.set(v.skillId, v);
    }
  }

  const hasVerifications = verifications.length > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={32} className="text-brand" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Skill Verification</h1>
        <p className="text-gray-500 mt-1">Earn a verified badge by passing a 20-question assessment</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {['Skill', 'Tier', 'Review'].map((label, i) => {
          const stepId = (['skill', 'tier', 'preflight'] as const)[i];
          const active = step === stepId;
          const done = (['skill', 'tier', 'preflight'] as const).indexOf(step) > i;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${done ? 'bg-green-500 text-white' : active ? 'bg-brand text-white' : 'bg-gray-100 text-gray-400'}`}>
                {done ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={`text-sm ${active ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{label}</span>
              {i < 2 && <ChevronRight size={14} className="text-gray-300" />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">

        {/* ── STEP 1: SKILL ──────────────────────────────────────────── */}
        {step === 'skill' && (
          <motion.div key="skill" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

            {/* My Verified Skills section */}
            {{ hasVerifications, && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy size={16} className="text-amber-500" />
                  <h2 className="font-semibold text-gray-900">My Verified Skills</h2>
                  {verifLoading && <Loader2 size={14} className="animate-spin text-gray-300" />}
                </div>

                {!verifLoading && verifications.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
                    No verified skills yet — complete an assessment below to get your first badge!
                  </div>
                )}

                <div className="space-y-2">
                  {verifications.map((v) => (
                    <VerifiedCard
                      key={v.verificationId}
                      v={v}
                      onRetake={() => {
                        const skill = skills.find(s => s._id === v.skillId);
                        if (skill) { setSkill(skill); setStep('tier'); }
                      }}
                    />
                  ))}
                </div>

                <div className="border-t border-gray-100 my-6" />
              </div>
            )}

            {/* Skill picker */}
            <h2 className="font-semibold text-gray-900 mb-3">
              {hasVerifications ? 'Verify a new skill' : 'Choose a skill to verify'}
            </h2>

            {skillsLoading && (
              <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                <Loader2 size={20} className="animate-spin" /> Loading skills…
              </div>
            )}
            {skillsError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{skillsError}</div>
            )}
            {!skillsLoading && !skillsError && (
              <div className="grid gap-3">
                {skills.map(skill => {
                  const bestVerif = verifMap.get(skill._id);
                  const verified = bestVerif && !bestVerif.isExpired && bestVerif.status === 'VERIFIED';
                  return (
                    <button
                      key={skill._id}
                      onClick={() => { setSkill(skill); setStep('tier'); }}
                      className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all
                        ${selectedSkill?._id === skill._id ? 'border-brand bg-blue-50' : 'border-gray-200 hover:border-brand/50'}`}
                    >
                      <span className="text-3xl">{skill.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{skill.name}</p>
                          {verified && (
                            <span className={`text-[10px] font-bold capitalize px-2 py-0.5 rounded-full border ${tierColor(bestVerif!.tier)}`}>
                              ✓ {bestVerif!.tier}
                            </span>
                          )}
                          {bestVerif && bestVerif.isExpired && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              Expired
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 capitalize">{skill.category}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </button>
                  );
                })}
              </div>
            )}
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
                      <span key={v.verificationId} className={`text-[11px] font-semibold capitalize px-2.5 py-1 rounded-full border ${v.isExpired ? 'text-gray-400 bg-gray-100 border-gray-200 line-through' : tierColor(v.tier)
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
                  const isExpired = existing?.isExpired;

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
                            <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                              ✓ Verified · {existing!.compositeScore}/100
                            </span>
                          )}
                          {isExpired && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
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
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setStep('tier')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                <ArrowLeft size={14} />Back
              </button>
              <h2 className="font-semibold text-gray-900">Review before starting</h2>
            </div>

            <div className="bg-gradient-to-r from-brand to-brand-light rounded-2xl p-5 text-white">
              <p className="opacity-80 text-sm mb-1">You are about to verify</p>
              <p className="text-2xl font-bold">
                {selectedSkill.name} <span className="capitalize text-white/80">· {selectedTier}</span>
              </p>
              {(() => {
                const prev = verifications.find(v => v.skillId === selectedSkill._id && v.tier === selectedTier);
                if (!prev) return null;
                return (
                  <p className="mt-2 text-sm text-white/70 flex items-center gap-1.5">
                    <RefreshCw size={13} />
                    {prev.isExpired ? `Renewing expired badge (was ${prev.compositeScore}/100)` : `Upgrading from ${prev.compositeScore}/100`}
                  </p>
                );
              })()}
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">What to expect — 20 questions</h3>
              <div className="space-y-2.5">
                {Q_DIST.map(q => (
                  <div key={q.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{q.icon}</span>
                      <span className="text-sm text-gray-700">{q.type}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{q.count} questions</span>
                      <span className="flex items-center gap-1"><Clock size={10} />{q.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5 border-orange-100 bg-orange-50">
              <h3 className="font-semibold text-sm text-orange-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={15} />Important rules
              </h3>
              <ul className="space-y-2">
                {RULES.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-orange-700">
                    <span className="mt-0.5 shrink-0">{r.icon}</span>{r.text}
                  </li>
                ))}
              </ul>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 accent-brand" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
              <span className="text-sm text-gray-700">I understand the rules and confirm I am completing this independently.</span>
            </label>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
            )}

            <button
              onClick={handleStart}
              disabled={!agreed || isStarting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
            >
              {isStarting
                ? <><Loader2 size={18} className="animate-spin" />Preparing…</>
                : <><ShieldCheck size={18} />Start Assessment</>}
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
