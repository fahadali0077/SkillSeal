import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ChevronRight, Clock, AlertTriangle, CheckCircle2, Monitor, Wifi, Eye, Loader2 } from 'lucide-react';
import type { SkillTier } from '@SkillSeal/shared';
import { useAssessmentStore } from './useAssessment';
import { assessmentApi, type ISkillOption } from './assessmentApi';
const TIERS: [{ value: SkillTier; label: string; description: string; time: string }] = [{ value: 'beginner', label: 'Beginner', description: 'Foundational concepts', time: '~25 min' }, { value: 'intermediate', label: 'Intermediate', description: 'Real-world patterns', time: '~30 min' }, { value: 'advanced', label: 'Advanced', description: 'Deep internals', time: '~35 min' }, { value: 'expert', label: 'Expert', description: 'Architecture & scalability', time: '~40 min' }] as unknown as [{ value: SkillTier; label: string; description: string; time: string }];
const RULES = [{ icon: <Monitor size={15} />, text: 'Stay on this tab throughout' }, { icon: <Eye size={15} />, text: 'No copy-pasting — clipboard is monitored' }, { icon: <Wifi size={15} />, text: 'Ensure stable internet connection' }, { icon: <AlertTriangle size={15} />, text: '3 violations will terminate your session' }];
const Q_DIST = [{ type: 'Multiple Choice', count: 14, time: '60s each', icon: '📝' }, { type: 'Scenario-based', count: 4, time: '120s each', icon: '🔍' }, { type: 'Written theory', count: 2, time: '150s each', icon: '✍️' }];
export default function AssessmentLanding() {
  const navigate = useNavigate(); const [params] = useSearchParams();
  const preSkillId = params.get('skillId'); const preTier = params.get('tier') as SkillTier | null;
  const [skills, setSkills] = useState<ISkillOption[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  useEffect(() => {
    assessmentApi.fetchSkills()
      .then(data => setSkills(data))
      .catch(e => setSkillsError(e.message ?? 'Failed to load skills'))
      .finally(() => setSkillsLoading(false));
  }, []);
  const prefilledSkill = skills.find(s => s._id === preSkillId) ?? null;
  const [step, setStep] = useState<'skill' | 'tier' | 'preflight'>(prefilledSkill && preTier ? 'preflight' : prefilledSkill ? 'tier' : 'skill');
  const [selectedSkill, setSkill] = useState<ISkillOption | null>(prefilledSkill); const [selectedTier, setTier] = useState<SkillTier | null>(preTier);
  const [agreed, setAgreed] = useState(false);
  const startSession = useAssessmentStore(s => s.startSession); const status = useAssessmentStore(s => s.status); const error = useAssessmentStore(s => s.error);
  const isStarting = status === 'starting';
  const handleStart = async () => { if (!selectedSkill || !selectedTier || !agreed) return; await startSession(selectedSkill._id, selectedSkill.name, selectedTier); navigate('/assessment/active'); };
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-8"><div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4"><ShieldCheck size={32} className="text-brand" /></div><h1 className="text-2xl font-bold text-gray-900">Skill Verification</h1><p className="text-gray-500 mt-1">Earn a verified badge by passing a 20-question assessment</p></div>
      <div className="flex items-center justify-center gap-2 mb-8">
        {['Skill', 'Tier', 'Review'].map((label, i) => { const stepId = ['skill', 'tier', 'preflight'][i] as typeof step; const active = step === stepId; const done = ['skill', 'tier', 'preflight'].indexOf(step) > i; return (<div key={label} className="flex items-center gap-2"><div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${done ? 'bg-green-500 text-white' : active ? 'bg-brand text-white' : 'bg-gray-100 text-gray-400'}`}>{done ? <CheckCircle2 size={14} /> : i + 1}</div><span className={`text-sm ${active ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{label}</span>{i < 2 && <ChevronRight size={14} className="text-gray-300" />}</div>); })}
      </div>
      <AnimatePresence mode="wait">
        {step === 'skill' && (<motion.div key="skill" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <h2 className="font-semibold text-gray-900 mb-4">Choose a skill to verify</h2>
          {skillsLoading && <div className="flex items-center justify-center py-12 text-gray-400 gap-2"><Loader2 size={20} className="animate-spin" /> Loading skills…</div>}
          {skillsError && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{skillsError}</div>}
          {!skillsLoading && !skillsError && <div className="grid gap-3">{skills.map(skill => (<button key={skill._id} onClick={() => { setSkill(skill); setStep('tier'); }} className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${selectedSkill?._id === skill._id ? 'border-brand bg-blue-50' : 'border-gray-200 hover:border-brand/50'}`}><span className="text-3xl">{skill.icon}</span><div className="flex-1"><p className="font-semibold text-gray-900">{skill.name}</p><p className="text-sm text-gray-500 capitalize">{skill.category}</p></div><ChevronRight size={16} className="text-gray-300" /></button>))}</div>}
        </motion.div>)}
        {step === 'tier' && (<motion.div key="tier" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <div className="flex items-center gap-2 mb-4"><button onClick={() => setStep('skill')} className="text-brand text-sm hover:underline">← Back</button><h2 className="font-semibold text-gray-900">Select tier for <span className="text-brand">{selectedSkill?.name}</span></h2></div>
          <div className="grid gap-3">{(TIERS as unknown as { value: SkillTier; label: string; description: string; time: string }[]).filter(tier => !selectedSkill || selectedSkill.availableTiers.includes(tier.value)).map(tier => (<button key={tier.value} onClick={() => { setTier(tier.value); setStep('preflight'); }} className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${selectedTier === tier.value ? 'border-brand bg-blue-50' : 'border-gray-200 hover:border-brand/50'}`}><div className="flex-1"><p className="font-semibold text-gray-900 capitalize">{tier.label}</p><p className="text-sm text-gray-500">{tier.description}</p></div><div className="flex items-center gap-1 text-xs text-gray-400"><Clock size={11} />{tier.time}</div></button>))}</div>
        </motion.div>)}
        {step === 'preflight' && selectedSkill && selectedTier && (<motion.div key="preflight" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
          <div className="flex items-center gap-2 mb-2"><button onClick={() => setStep('tier')} className="text-brand text-sm hover:underline">← Back</button><h2 className="font-semibold text-gray-900">Review before starting</h2></div>
          <div className="bg-gradient-to-r from-brand to-brand-light rounded-2xl p-5 text-white"><p className="opacity-80 text-sm mb-1">You are about to verify</p><p className="text-2xl font-bold">{selectedSkill.name} <span className="capitalize text-white/80">· {selectedTier}</span></p></div>
          <div className="card p-5"><h3 className="font-semibold text-sm text-gray-700 mb-3">What to expect — 20 questions</h3><div className="space-y-2.5">{Q_DIST.map(q => <div key={q.type} className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-lg">{q.icon}</span><span className="text-sm text-gray-700">{q.type}</span></div><div className="flex items-center gap-3 text-xs text-gray-400"><span>{q.count} questions</span><span className="flex items-center gap-1"><Clock size={10} />{q.time}</span></div></div>)}</div></div>
          <div className="card p-5 border-orange-100 bg-orange-50"><h3 className="font-semibold text-sm text-orange-800 mb-3 flex items-center gap-2"><AlertTriangle size={15} />Important rules</h3><ul className="space-y-2">{RULES.map((r, i) => <li key={i} className="flex items-start gap-2 text-sm text-orange-700"><span className="mt-0.5 shrink-0">{r.icon}</span>{r.text}</li>)}</ul></div>
          <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" className="mt-1 accent-brand" checked={agreed} onChange={e => setAgreed(e.target.checked)} /><span className="text-sm text-gray-700">I understand the rules and confirm I am completing this independently.</span></label>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
          <button onClick={handleStart} disabled={!agreed || isStarting} className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base">
            {isStarting ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}{isStarting ? 'Preparing…' : 'Start Assessment'}
          </button>
        </motion.div>)}
      </AnimatePresence>
    </div>
  );
}
