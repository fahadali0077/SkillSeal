// ─────────────────────────────────────────────────────────────────────────────
// JobFilters.tsx  –  filter sidebar that syncs to URL query params
// ─────────────────────────────────────────────────────────────────────────────
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';

const WORK_TYPES       = ['remote', 'hybrid', 'on-site'];
const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'freelance', 'internship'];
const DATE_OPTIONS     = [{ value: 'any', label: 'Any time' }, { value: 'week', label: 'Past week' }, { value: 'month', label: 'Past month' }];
const SORT_OPTIONS     = [{ value: 'relevant', label: 'Most relevant' }, { value: 'recent', label: 'Most recent' }, { value: 'salary', label: 'Highest salary' }];

export default function JobFilters() {
  const [params, setParams] = useSearchParams();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.set('page', '1');
    setParams(next);
  };

  const toggle = (key: string, value: string) => {
    set(key, params.get(key) === value ? '' : value);
  };

  const clearAll = () => setParams(new URLSearchParams());
  const hasFilters = ['workType','employmentType','datePosted','verifiedOnly','salaryMin'].some((k) => params.has(k));

  return (
    <div className="card p-5 space-y-5 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <SlidersHorizontal size={15} /> Filters
        </h3>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-brand flex items-center gap-1 hover:text-brand-dark">
            <X size={12} /> Clear all
          </button>
        )}
      </div>

      {/* Sort */}
      <div>
        <p className="font-medium text-gray-700 mb-2">Sort by</p>
        <div className="space-y-1">
          {SORT_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="sort"
                value={o.value}
                checked={(params.get('sort') ?? 'recent') === o.value}
                onChange={() => set('sort', o.value)}
                className="accent-brand"
              />
              <span className="text-gray-700">{o.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Work type */}
      <div>
        <p className="font-medium text-gray-700 mb-2">Work type</p>
        <div className="flex flex-wrap gap-2">
          {WORK_TYPES.map((wt) => (
            <button
              key={wt}
              onClick={() => toggle('workType', wt)}
              className={`text-xs px-3 py-1.5 rounded-sm border transition-colors capitalize
                ${params.get('workType') === wt ? 'bg-brand text-white border-brand' : 'border-gray-200 text-gray-600 hover:border-brand hover:text-brand'}`}
            >
              {wt}
            </button>
          ))}
        </div>
      </div>

      {/* Employment type */}
      <div>
        <p className="font-medium text-gray-700 mb-2">Employment type</p>
        <div className="space-y-1">
          {EMPLOYMENT_TYPES.map((et) => (
            <label key={et} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={params.get('employmentType') === et}
                onChange={() => toggle('employmentType', et)}
                className="accent-brand"
              />
              <span className="text-gray-700 capitalize">{et.replace('-', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Date posted */}
      <div>
        <p className="font-medium text-gray-700 mb-2">Date posted</p>
        <div className="space-y-1">
          {DATE_OPTIONS.map((d) => (
            <label key={d.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="datePosted"
                value={d.value}
                checked={(params.get('datePosted') ?? 'any') === d.value}
                onChange={() => set('datePosted', d.value)}
                className="accent-brand"
              />
              <span className="text-gray-700">{d.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Salary min */}
      <div>
        <p className="font-medium text-gray-700 mb-2">Minimum salary</p>
        <select
          value={params.get('salaryMin') ?? ''}
          onChange={(e) => set('salaryMin', e.target.value)}
          className="input text-sm w-full"
        >
          <option value="">Any</option>
          {[30000, 50000, 75000, 100000, 150000, 200000].map((s) => (
            <option key={s} value={s}>${s.toLocaleString()}</option>
          ))}
        </select>
      </div>

      {/* Verified only */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={params.get('verifiedOnly') === 'true'}
          onChange={(e) => set('verifiedOnly', e.target.checked ? 'true' : '')}
          className="accent-brand"
        />
        <span className="text-gray-700 font-medium">Verified skills only</span>
      </label>
    </div>
  );
}
