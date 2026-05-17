// ─────────────────────────────────────────────────────────────────────────────
// JobSearchPage.tsx  –  full job search page with filters sidebar
// ─────────────────────────────────────────────────────────────────────────────
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Briefcase, MapPin, ShieldCheck, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useJobSearch } from './useJobs';
import JobCard from './JobCard';
import JobFilters from './JobFilters';
import type { JobSearchParams } from './jobsApi';
import { useSEO } from '../../lib/useSEO';

export default function JobSearchPage() {
  useSEO({title:'Browse Verified Jobs',description:'Find jobs where employers verify your skills before you apply. Search thousands of roles matched to your proven abilities on SkillSeal.',keywords:'verified jobs, skill verified hiring, developer jobs, recruiter job board',canonical:'/jobs'});
  const [params, setParams] = useSearchParams();

  const searchParams: JobSearchParams = {
    keyword:        params.get('keyword') || undefined,
    skill:          params.get('skill') || undefined,
    location:       params.get('location') || undefined,
    workType:       params.get('workType') || undefined,
    employmentType: params.get('employmentType') || undefined,
    sort:           (params.get('sort') as JobSearchParams['sort']) || 'recent',
    datePosted:     (params.get('datePosted') as JobSearchParams['datePosted']) || 'any',
    verifiedOnly:   params.get('verifiedOnly') === 'true',
    salaryMin:      params.get('salaryMin') ? parseInt(params.get('salaryMin')!, 10) : undefined,
    page:           params.get('page') ? parseInt(params.get('page')!, 10) : 1,
    limit:          20,
  };

  const { data, isLoading, isFetching } = useJobSearch(searchParams);

  const setKeyword = (v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set('keyword', v); else next.delete('keyword');
    next.set('page', '1');
    setParams(next);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* ── Gradient hero ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-brand to-blue-700 text-white p-5 sm:p-6 mb-5">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
            <Briefcase size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Browse verified jobs</h1>
            <p className="text-white/80 text-sm mt-0.5">Find roles where your skills are proven, not promised</p>
          </div>
        </div>
        <div className="absolute -right-8 -top-12 w-44 h-44 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-44 h-44 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      </div>

      {/* ── Search bar ──────────────────────────────────────────────────── */}
      <div className="card p-2.5 mb-5 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            defaultValue={params.get('keyword') ?? ''}
            placeholder="Job title, keyword, or company…"
            className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-brand focus:ring-4 focus:ring-brand/10 rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none transition-all"
            onKeyDown={(e) => e.key === 'Enter' && setKeyword((e.target as HTMLInputElement).value)}
            onBlur={(e) => setKeyword(e.target.value)}
          />
        </div>
        <div className="relative sm:w-56">
          <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            defaultValue={params.get('location') ?? ''}
            placeholder="Location"
            className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-brand focus:ring-4 focus:ring-brand/10 rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const next = new URLSearchParams(params);
                const v = (e.target as HTMLInputElement).value;
                if (v) next.set('location', v); else next.delete('location');
                setParams(next);
              }
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Filters sidebar */}
        <div className="lg:col-span-1 lg:sticky lg:top-20 lg:self-start">
          <JobFilters />
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {/* Results header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              {isLoading ? (
                <>Searching…</>
              ) : (
                <>
                  <span className="font-semibold text-gray-900 tabular-nums">{data?.total ?? 0}</span>
                  <span className="text-gray-500">job{(data?.total ?? 0) !== 1 ? 's' : ''} found</span>
                </>
              )}
              {isFetching && !isLoading && <Loader2 size={12} className="animate-spin text-gray-400" />}
            </p>

            {searchParams.verifiedOnly && (
              <span className="badge-info hidden sm:inline-flex">
                <ShieldCheck size={10} /> Verified-only
              </span>
            )}
          </div>

          {/* Job cards */}
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="skeleton w-10 h-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-3 w-48 rounded" />
                      <div className="skeleton h-2.5 w-32 rounded" />
                    </div>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <div className="skeleton h-2.5 w-16 rounded-full" />
                    <div className="skeleton h-2.5 w-20 rounded-full" />
                    <div className="skeleton h-2.5 w-14 rounded-full" />
                  </div>
                  <div className="flex gap-2">
                    <div className="skeleton h-5 w-20 rounded-full" />
                    <div className="skeleton h-5 w-24 rounded-full" />
                    <div className="skeleton h-5 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : data?.jobs.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                <Briefcase size={28} className="text-gray-400" />
              </div>
              <p className="font-bold text-gray-900 mb-1">No jobs match your filters</p>
              <p className="text-sm text-gray-500 max-w-xs mx-auto mb-5">Try removing some filters, broadening your keywords, or expanding the location.</p>
              <button
                onClick={() => setParams(new URLSearchParams())}
                className="btn-secondary text-sm mx-auto"
              >
                <RefreshCw size={13} /> Clear all filters
              </button>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              <div className="space-y-4">
                {data?.jobs.map((job, i) => (
                  <motion.div
                    key={job._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  >
                    <JobCard job={job} />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 card p-2 w-fit mx-auto">
              <button
                onClick={() => { const n = new URLSearchParams(params); n.set('page', String(Math.max(1, searchParams.page! - 1))); setParams(n); }}
                disabled={searchParams.page === 1}
                className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="text-xs text-gray-500 px-3 tabular-nums">
                Page <span className="font-semibold text-gray-900">{searchParams.page}</span> of <span className="font-semibold text-gray-900">{data.totalPages}</span>
              </span>
              <button
                onClick={() => { const n = new URLSearchParams(params); n.set('page', String(searchParams.page! + 1)); setParams(n); }}
                disabled={searchParams.page === data.totalPages}
                className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
