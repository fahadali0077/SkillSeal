// ─────────────────────────────────────────────────────────────────────────────
// JobSearchPage.tsx  –  full job search page with filters sidebar
// ─────────────────────────────────────────────────────────────────────────────
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Briefcase, MapPin } from 'lucide-react';
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
      {/* Search bar */}
      <div className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            defaultValue={params.get('keyword') ?? ''}
            placeholder="Job title, keyword, or company…"
            className="input pl-11 py-3 text-sm w-full"
            onKeyDown={(e) => e.key === 'Enter' && setKeyword((e.target as HTMLInputElement).value)}
            onBlur={(e) => setKeyword(e.target.value)}
          />
        </div>
        <div className="relative">
          <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            defaultValue={params.get('location') ?? ''}
            placeholder="Location"
            className="input pl-11 py-3 text-sm w-48"
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
        <div className="lg:col-span-1">
          <JobFilters />
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {/* Results header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {isLoading ? 'Searching…' : `${data?.total ?? 0} jobs found`}
              {isFetching && !isLoading && <Loader2 size={12} className="inline ml-2 animate-spin" />}
            </p>
          </div>

          {/* Job cards */}
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-gray-300" /></div>
          ) : data?.jobs.length === 0 ? (
            <div className="card p-10 text-center text-gray-400">
              <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-600">No jobs match your filters.</p>
              <p className="text-sm mt-1">Try adjusting your search or filters.</p>
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
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => { const n = new URLSearchParams(params); n.set('page', String(Math.max(1, searchParams.page! - 1))); setParams(n); }}
                disabled={searchParams.page === 1}
                className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40"
              >← Prev</button>
              <span className="text-sm text-gray-500">Page {searchParams.page} of {data.totalPages}</span>
              <button
                onClick={() => { const n = new URLSearchParams(params); n.set('page', String(searchParams.page! + 1)); setParams(n); }}
                disabled={searchParams.page === data.totalPages}
                className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-40"
              >Next →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
