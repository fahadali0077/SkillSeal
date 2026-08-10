import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCandidateSearch, type TalentSearchParams, type ICandidateCard, type IntegrityLevel } from './recruiterApi';
import SealMark from '../../components/SealMark';
import { enterAt } from '../../lib/motion';

const SKILLS = ['React', 'Node.js', 'MongoDB', 'TypeScript', 'Python', 'AWS'];
const TIERS = ['beginner', 'intermediate', 'advanced', 'expert'];
const SORTS = [
  { value: 'score'  as const, label: 'Score' },
  { value: 'date'   as const, label: 'Date issued' },
  { value: 'active' as const, label: 'Last active' },
];

const TIER_SHORT: Record<string, string> = {
  beginner: 'BEG', intermediate: 'INT', advanced: 'ADV', expert: 'EXP',
};

// Integrity is a column, not a tooltip.
function Integrity({ level, aiFlag }: { level: IntegrityLevel; aiFlag: boolean }) {
  const cfg = {
    green:  { label: 'Clean',   cls: 'text-pass' },
    yellow: { label: '1 flag',  cls: 'text-warn' },
    red:    { label: 'Flagged', cls: 'text-fail' },
  }[level];
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.06em] ${cfg.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      {aiFlag && level === 'green' ? 'AI review' : cfg.label}
    </span>
  );
}

/** Active filters read back as removable terms, the way a query does. */
function FilterPill({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-sm border border-paper-rule bg-paper-card px-2.5 py-1.5 font-mono text-[11px] tracking-[0.04em] text-ink-700">
      {label}
      <button onClick={onClear} className="text-ink-400 hover:text-ink-900 transition-colors" aria-label={`Remove ${label}`}>
        <X size={12} />
      </button>
    </span>
  );
}

function CandidateRow({ c, index }: { c: ICandidateCard; index: number }) {
  const top = [...c.verifiedSkills].sort((a, b) => b.compositeScore - a.compositeScore)[0];
  const place = [c.location?.city, c.location?.country].filter(Boolean).join(', ');

  return (
    <motion.tr {...enterAt(index)} className="hover:bg-paper-sunk transition-colors">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          {c.profilePhoto
            ? <img src={c.profilePhoto} alt="" className="w-9 h-9 rounded-full object-cover border border-paper-line shrink-0" />
            : <span className="w-9 h-9 rounded-full bg-ink-800 text-paper flex items-center justify-center font-mono text-[11px] shrink-0">
                {c.firstName?.[0]}{c.lastName?.[0]}
              </span>}
          <div className="min-w-0">
            <Link
              to={`/recruiter/candidates/${c.userId}`}
              className="text-sm font-semibold text-ink-900 hover:text-seal-700 block truncate"
            >
              {c.fullName}
            </Link>
            <p className="text-xs text-ink-500 truncate">
              {c.headline}
              {place && ` · ${place}`}
              {c.connectionDegree !== 'none' && ` · ${c.connectionDegree}`}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3.5 whitespace-nowrap">
        {top ? (
          <span className="inline-flex items-center gap-2">
            <SealMark size={16} tone="seal" className="shrink-0" />
            <span className="text-sm text-ink-900">{top.skillName}</span>
            <span className="font-mono text-[10px] tracking-[0.08em] text-ink-400">
              {TIER_SHORT[top.tier] ?? top.tier}
            </span>
          </span>
        ) : (
          <span className="font-mono text-[11px] text-ink-400">—</span>
        )}
      </td>

      <td className="px-4 py-3.5 text-right whitespace-nowrap">
        <span className="font-mono text-base text-ink-900 tabular-nums">
          {top ? top.compositeScore : '—'}
        </span>
      </td>

      <td className="px-4 py-3.5 whitespace-nowrap">
        <Integrity level={c.behaviorIntegrity} aiFlag={c.aiFlag} />
      </td>
    </motion.tr>
  );
}

export default function TalentSearch() {
  const [params, setParams] = useState<TalentSearchParams>({ sort: 'score', page: 1 });
  const [keyword, setKeyword] = useState('');
  const { data, isLoading, isFetching } = useCandidateSearch(params, true);
  const candidates = data?.candidates ?? [];
  const total = data?.total ?? 0;
  const set = (patch: Partial<TalentSearchParams>) => setParams(p => ({ ...p, ...patch, page: 1 }));

  const active: { label: string; clear: () => void }[] = [];
  if (params.skill)    active.push({ label: params.skill, clear: () => set({ skill: undefined }) });
  if (params.tier)     active.push({ label: params.tier, clear: () => set({ tier: undefined }) });
  if (params.location) active.push({ label: params.location, clear: () => set({ location: undefined }) });
  if (params.verifiedOnly) active.push({ label: 'Sealed only', clear: () => set({ verifiedOnly: undefined }) });
  if (params.openToWork)   active.push({ label: 'Open to work', clear: () => set({ openToWork: undefined }) });

  return (
    <div className="space-y-6">
      {/* ── Query ──────────────────────────────────────────────────────── */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && set({ skill: keyword || undefined })}
              placeholder="Search by sealed skill…"
              className="input pl-9 text-sm w-full"
            />
          </div>
          <input
            placeholder="Location"
            onChange={e => set({ location: e.target.value || undefined })}
            className="input text-sm sm:w-44"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select className="input input-sm w-auto" onChange={e => set({ skill: e.target.value || undefined })}>
            <option value="">All skills</option>
            {SKILLS.map(s => <option key={s} value={s.toLowerCase().replace('.', '').replace(' ', '-')}>{s}</option>)}
          </select>

          <select className="input input-sm w-auto capitalize" onChange={e => set({ tier: e.target.value as TalentSearchParams['tier'] || undefined })}>
            <option value="">All tiers</option>
            {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <label className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer">
            <input type="checkbox" className="w-3.5 h-3.5 accent-ink-800" onChange={e => set({ verifiedOnly: e.target.checked || undefined })} />
            Sealed only
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer">
            <input type="checkbox" className="w-3.5 h-3.5 accent-ink-800" onChange={e => set({ openToWork: e.target.checked || undefined })} />
            Open to work
          </label>

          <div className="flex items-center gap-1 ml-auto">
            <span className="label mr-1">Sort</span>
            {SORTS.map(s => (
              <button
                key={s.value}
                onClick={() => set({ sort: s.value })}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-sm transition-colors
                  ${params.sort === s.value ? 'bg-ink-800 text-paper' : 'text-ink-500 hover:bg-paper-sunk'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {active.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {active.map(f => <FilterPill key={f.label} label={f.label} onClear={f.clear} />)}
          </div>
        )}
      </div>

      {/* ── Result count ───────────────────────────────────────────────── */}
      <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink-500 tabular-nums">
        {isLoading
          ? 'Searching'
          : `${total} candidate${total !== 1 ? 's' : ''} · sorted by ${SORTS.find(s => s.value === params.sort)?.label.toLowerCase()}`}
        {isFetching && !isLoading && <Loader2 size={12} className="inline ml-2 animate-spin" />}
      </p>

      {/* ── Register ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-16 text-ink-300"><Loader2 size={24} className="animate-spin" /></div>
      ) : candidates.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="font-display text-xl text-ink-900">No candidates match these filters.</p>
          <p className="text-sm text-ink-500 mt-2">Widen the score band or drop a tier requirement.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr className="border-b border-paper-rule bg-paper-sunk">
                  {['Candidate', 'Top seal', 'Score', 'Integrity'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-2.5 label ${i === 2 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-line">
                {candidates.map((c, i) => <CandidateRow key={c.userId} c={c} index={i} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {total > 20 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setParams(p => ({ ...p, page: Math.max(1, (p.page ?? 1) - 1) }))}
            disabled={params.page === 1}
            className="btn-quiet py-2 px-3.5 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-ink-500 tabular-nums">
            Page {params.page}
          </span>
          <button
            onClick={() => setParams(p => ({ ...p, page: (p.page ?? 1) + 1 }))}
            disabled={(params.page ?? 1) * 20 >= total}
            className="btn-quiet py-2 px-3.5 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
