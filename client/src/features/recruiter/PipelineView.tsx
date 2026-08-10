import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, CheckSquare, Loader2, AlertTriangle } from 'lucide-react';
import { usePipeline, useUpsertPipeline, useExportCsv, type IPipelineCandidate, type IntegrityLevel } from './recruiterApi';
import SealMark from '../../components/SealMark';

const STAGES = ['shortlisted', 'contacted', 'interviewing', 'offer', 'rejected'] as const;
type Stage = typeof STAGES[number];

// Stages are ordered, so they escalate by weight — not by five different hues.
const STAGE_LABEL: Record<Stage, string> = {
  shortlisted: 'Shortlisted',
  contacted: 'Contacted',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
};

const TIER_SHORT: Record<string, string> = {
  beginner: 'BEG', intermediate: 'INT', advanced: 'ADV', expert: 'EXP',
};

function IntegrityDot({ level }: { level: IntegrityLevel }) {
  const cls = level === 'green' ? 'bg-pass' : level === 'yellow' ? 'bg-warn' : 'bg-fail';
  const label = level === 'green' ? 'Integrity clean' : level === 'yellow' ? 'One flag' : 'Integrity flagged';
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cls}`} title={label} aria-label={label} />;
}

function PCard({ candidate, onMove, selected, onSelect }: {
  candidate: IPipelineCandidate;
  onMove: (id: string, s: Stage) => void;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const top = [...candidate.verifiedSkills].sort((a, b) => b.compositeScore - a.compositeScore)[0];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
      className={`bg-paper-card border p-3 space-y-2.5 ${selected ? 'border-ink-800' : 'border-paper-line'}`}
    >
      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(candidate.applicationId)}
          className="w-3.5 h-3.5 accent-ink-800 shrink-0"
          aria-label={`Select ${candidate.fullName}`}
        />
        {candidate.profilePhoto
          ? <img src={candidate.profilePhoto} alt="" className="w-8 h-8 rounded-full object-cover border border-paper-line shrink-0" />
          : <span className="w-8 h-8 rounded-full bg-ink-800 text-paper flex items-center justify-center font-mono text-[10px] shrink-0">
              {candidate.fullName[0]}
            </span>}
        <div className="flex-1 min-w-0">
          <Link
            to={`/recruiter/candidates/${candidate.candidateId}`}
            className="text-sm font-semibold text-ink-900 hover:text-seal-700 truncate block"
          >
            {candidate.fullName}
          </Link>
          <p className="text-xs text-ink-400 truncate">{candidate.headline}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <IntegrityDot level={candidate.behaviorIntegrity} />
          {candidate.aiFlag && <AlertTriangle size={12} className="text-warn" />}
        </div>
      </div>

      {top && (
        <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.04em] text-ink-600 tabular-nums">
          <SealMark size={13} tone="seal" className="shrink-0" />
          {top.skillName} {TIER_SHORT[top.tier] ?? top.tier} · {top.compositeScore}
        </p>
      )}

      <select
        value={candidate.status}
        onChange={e => onMove(candidate.applicationId, e.target.value as Stage)}
        className="w-full text-xs border border-paper-line rounded-sm px-2 py-1.5 bg-paper-sunk text-ink-700 focus:border-ink-800 outline-none capitalize"
        aria-label={`Move ${candidate.fullName}`}
      >
        {STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
      </select>
    </motion.div>
  );
}

export default function PipelineView({ jobId }: { jobId?: string } = {}) {
  const { data: pipeline, isLoading } = usePipeline(jobId);
  const upsert = useUpsertPipeline();
  const exportCsv = useExportCsv();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleMove = async (appId: string, newStatus: Stage) => {
    const cand = Object.values(pipeline ?? {}).flat().find(c => c.applicationId === appId);
    if (!cand) return;
    await upsert.mutateAsync({ candidateId: cand.candidateId, status: newStatus, jobId });
  };

  const toggleSelect = (id: string) => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const totalCount = Object.values(pipeline ?? {}).flat().length;

  if (isLoading) return <div className="flex justify-center py-16 text-ink-300"><Loader2 size={24} className="animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSelected(new Set(Object.values(pipeline ?? {}).flat().map(c => c.applicationId)))}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900 transition-colors"
        >
          <CheckSquare size={15} />Select all
          <span className="font-mono text-xs text-ink-400 tabular-nums">({totalCount})</span>
        </button>

        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
            <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink-700 tabular-nums">
              {selected.size} selected
            </span>
            <button
              onClick={() => exportCsv.mutate({ jobId })}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-600 hover:text-ink-900 px-3 py-1.5 rounded-sm border border-paper-rule hover:border-ink-300 transition-colors"
            >
              <Download size={13} />Export CSV
            </button>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto pb-2">
        {STAGES.map(stage => {
          const cards = pipeline?.[stage] ?? [];
          return (
            <div key={stage} className="flex flex-col gap-2.5 min-w-[190px]">
              <div className="flex items-baseline justify-between gap-2 pb-2 border-b border-paper-rule">
                <span className="label text-ink-700">{STAGE_LABEL[stage]}</span>
                <span className="font-mono text-sm text-ink-900 tabular-nums">{cards.length}</span>
              </div>

              <AnimatePresence mode="popLayout">
                {cards.length === 0 ? (
                  <div key="empty" className="border border-dashed border-paper-rule p-4 text-center">
                    <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-400">Empty</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {cards.map(c => (
                      <PCard
                        key={c.applicationId}
                        candidate={c}
                        onMove={handleMove}
                        selected={selected.has(c.applicationId)}
                        onSelect={toggleSelect}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
