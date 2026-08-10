import { useSEO } from '../../lib/useSEO';
// ─────────────────────────────────────────────────────────────────────────────
// MyApplicationsPage.tsx  –  candidate's applications grouped by status
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, CheckCircle2, XCircle, Clock, Star, MessageSquare, Search, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useMyApplications } from './useJobs';
import { on, SOCKET_EVENTS } from '../../lib/socketClient';
import type { IApplicationOut } from './types';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  applied:      { label: 'Applied',      color: 'text-gray-700',   bg: 'bg-gray-50',    border: 'border-gray-200',   icon: <Clock size={12} /> },
  viewed:       { label: 'Viewed',       color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200',   icon: <Clock size={12} /> },
  shortlisted:  { label: 'Shortlisted',  color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200',  icon: <Star size={12} /> },
  contacted:    { label: 'Contacted',    color: 'text-brand',      bg: 'bg-blue-50',    border: 'border-blue-200',   icon: <MessageSquare size={12} /> },
  interviewing: { label: 'Interviewing', color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200', icon: <CheckCircle2 size={12} /> },
  offer:        { label: 'Offer',        color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200',  icon: <Star size={12} /> },
  rejected:     { label: 'Not selected', color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-200',    icon: <XCircle size={12} /> },
  withdrawn:    { label: 'Withdrawn',    color: 'text-gray-400',   bg: 'bg-gray-50',    border: 'border-gray-200',   icon: <XCircle size={12} /> },
};

const STATUS_TABS = ['all', 'applied', 'shortlisted', 'interviewing', 'offer', 'rejected'];

function AppCard({ app }: { app: IApplicationOut }) {
  const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG['applied'];
  const matchColor = app.matchScore >= 70 ? 'text-green-600' : app.matchScore >= 40 ? 'text-brand' : 'text-gray-400';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4 sm:p-5 flex items-center gap-3 sm:gap-4 transition-all duration-200 hover:border-brand/30"
      style={{ transitionProperty: 'box-shadow, transform, border-color' }}
    >
      {app.companyLogo
        ? <img src={app.companyLogo} alt={app.companyName} className="w-12 h-12 rounded-xl object-contain border border-gray-100 bg-white shrink-0" />
        : <div className="w-12 h-12 rounded-xl bg-paper-sunk flex items-center justify-center text-brand font-bold shrink-0">
            {app.companyName[0]}
          </div>
      }

      <div className="flex-1 min-w-0">
        <Link to={`/jobs/${app.jobId}`} className="font-semibold text-gray-900 hover:text-brand text-sm sm:text-base block truncate transition-colors">
          {app.jobTitle}
        </Link>
        <p className="text-xs text-gray-500 truncate">{app.companyName}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
        </p>
      </div>

      {app.matchScore > 0 && (
        <div className="text-center shrink-0 hidden sm:block">
          <div className={`text-lg font-bold tabular-nums ${matchColor}`}>{app.matchScore}%</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">Match</div>
        </div>
      )}

      <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-sm border shrink-0 ${cfg.bg} ${cfg.color} ${cfg.border}`}>
        {cfg.icon}
        <span className="hidden sm:inline">{cfg.label}</span>
      </div>
    </motion.div>
  );
}

export default function MyApplicationsPage() {
  useSEO({ title: 'My Applications', description: 'Track your job applications on SkillSeal.', canonical: '/applications' });
  const [activeTab, setActiveTab] = useState('all');
  const { data: apps = [], isLoading } = useMyApplications();
  const qc = useQueryClient();

  // PARTIAL-07: when the server pushes an application status update (sent
  // by recruiter.service.ts upsertPipeline → notify.applicationStatus →
  // SOCKET_EVENTS.NOTIFICATION), invalidate the cache so the new status
  // shows up without a manual refresh.
  useEffect(() => {
    const off = on<{ type: string }>(SOCKET_EVENTS.NOTIFICATION, (payload) => {
      if (payload?.type === 'application_status' || payload?.type === 'application_status_update') {
        void qc.invalidateQueries({ queryKey: ['myApplications'] });
      }
    });
    return off;
  }, [qc]);

  const filtered = activeTab === 'all' ? apps : apps.filter((a) => a.status === activeTab);

  // Pipeline stats
  const stats = {
    total:    apps.length,
    active:   apps.filter(a => ['applied', 'viewed', 'shortlisted', 'contacted', 'interviewing'].includes(a.status)).length,
    offers:   apps.filter(a => a.status === 'offer').length,
    closed:   apps.filter(a => ['rejected', 'withdrawn'].includes(a.status)).length,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">

      {/* ── Gradient hero with pipeline stats ─────────────────────────── */}
      <div className="mb-6 pb-4 border-b border-paper-line">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded border border-paper-line bg-paper-sunk text-ink-700 flex items-center justify-center shrink-0">
              <Briefcase size={22} />
            </div>
            <div>
              <h1 className="font-display text-[28px] leading-none text-ink-900">My Applications</h1>
              <p className="text-sm text-ink-500 mt-2">Track every role you've applied to</p>
            </div>
          </div>

          {apps.length > 0 && (
            <div className="flex gap-5 text-center">
              <div>
                <div className="font-mono text-2xl leading-none text-ink-900 tabular-nums">{stats.total}</div>
                <div className="label mt-1.5">Total</div>
              </div>
              <div className="w-px bg-paper-line" />
              <div>
                <div className="font-mono text-2xl leading-none text-ink-900 tabular-nums">{stats.active}</div>
                <div className="label mt-1.5">Active</div>
              </div>
              <div className="w-px bg-paper-line" />
              <div>
                <div className="font-mono text-2xl leading-none text-ink-900 tabular-nums">{stats.offers}</div>
                <div className="label mt-1.5">Offers</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Status filter pill tabs ───────────────────────────────────── */}
      <div className="card p-1.5 mb-5 flex gap-1 overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const count = tab === 'all' ? apps.length : apps.filter((a) => a.status === tab).length;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3 py-2 rounded-lg whitespace-nowrap transition-all shrink-0
                ${isActive ? 'bg-brand text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <span>{tab === 'all' ? 'All' : STATUS_CONFIG[tab]?.label ?? tab}</span>
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm tabular-nums ${isActive ? 'bg-paper-card text-ink-900' : 'bg-paper-sunk text-ink-500'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="card p-5 flex items-center gap-4">
              <div className="skeleton w-12 h-12 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-48 rounded" />
                <div className="skeleton h-2.5 w-32 rounded" />
                <div className="skeleton h-2 w-24 rounded" />
              </div>
              <div className="skeleton h-7 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-paper-sunk flex items-center justify-center">
            <Briefcase size={28} className="text-brand" />
          </div>
          <p className="font-bold text-gray-900 mb-1">
            {activeTab === 'all' ? "No applications yet" : `Nothing in "${STATUS_CONFIG[activeTab]?.label ?? activeTab}"`}
          </p>
          <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
            {activeTab === 'all'
              ? "When you apply to jobs, they'll show up here so you can track every step."
              : "Applications with this status will appear here."}
          </p>
          <Link to="/jobs" className="btn-primary text-sm mx-auto">
            <Search size={14} /> Browse jobs
            <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {filtered.map((app) => <AppCard key={app._id} app={app} />)}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
