import { useSEO } from '../../lib/useSEO';
// ─────────────────────────────────────────────────────────────────────────────
// MyApplicationsPage.tsx  –  candidate's applications grouped by status
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Loader2, CheckCircle2, XCircle, Clock, Star, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useMyApplications } from './useJobs';
import type { IApplicationOut } from './types';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  applied:      { label: 'Applied',      color: 'text-gray-600',  bg: 'bg-gray-100',   icon: <Clock size={14} /> },
  viewed:       { label: 'Viewed',       color: 'text-blue-600',  bg: 'bg-blue-50',    icon: <Clock size={14} /> },
  shortlisted:  { label: 'Shortlisted',  color: 'text-green-700', bg: 'bg-green-50',   icon: <Star size={14} /> },
  contacted:    { label: 'Contacted',    color: 'text-brand',     bg: 'bg-blue-50',    icon: <MessageSquare size={14} /> },
  interviewing: { label: 'Interviewing', color: 'text-purple-700',bg: 'bg-purple-50',  icon: <CheckCircle2 size={14} /> },
  offer:        { label: 'Offer',        color: 'text-amber-700', bg: 'bg-amber-50',   icon: <Star size={14} /> },
  rejected:     { label: 'Not selected', color: 'text-red-600',   bg: 'bg-red-50',     icon: <XCircle size={14} /> },
  withdrawn:    { label: 'Withdrawn',    color: 'text-gray-400',  bg: 'bg-gray-50',    icon: <XCircle size={14} /> },
};

const STATUS_TABS = ['all', 'applied', 'shortlisted', 'interviewing', 'offer', 'rejected'];

function AppCard({ app }: { app: IApplicationOut }) {
  const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG['applied'];
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5 flex items-center gap-4">
      {app.companyLogo
        ? <img src={app.companyLogo} alt={app.companyName} className="w-12 h-12 rounded-xl object-contain border border-gray-100 shrink-0" />
        : <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold shrink-0">{app.companyName[0]}</div>
      }
      <div className="flex-1 min-w-0">
        <Link to={`/jobs/${app.jobId}`} className="font-semibold text-gray-900 hover:text-brand text-sm">{app.jobTitle}</Link>
        <p className="text-xs text-gray-500">{app.companyName}</p>
        <p className="text-xs text-gray-400 mt-0.5">Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}</p>
      </div>
      {app.matchScore > 0 && (
        <div className="text-center shrink-0">
          <div className="text-lg font-bold text-brand">{app.matchScore}%</div>
          <div className="text-xs text-gray-400">match</div>
        </div>
      )}
      <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.color} shrink-0`}>
        {cfg.icon}{cfg.label}
      </div>
    </motion.div>
  );
}

export default function MyApplicationsPage() {
  useSEO({ title: 'My Applications', description: 'Track your job applications on SkillSeal.', canonical: '/applications' });
  const [activeTab, setActiveTab] = useState('all');
  const { data: apps = [], isLoading } = useMyApplications();

  const filtered = activeTab === 'all' ? apps : apps.filter((a) => a.status === activeTab);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Briefcase size={22} className="text-brand" />
        <h1 className="text-xl font-bold text-gray-900">My Applications</h1>
        <span className="text-sm text-gray-400 font-medium">{apps.length} total</span>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-5">
        {STATUS_TABS.map((tab) => {
          const count = tab === 'all' ? apps.length : apps.filter((a) => a.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors
                ${activeTab === tab ? 'bg-brand text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <span className="capitalize">{tab === 'all' ? 'All' : STATUS_CONFIG[tab]?.label ?? tab}</span>
              {count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-white/20' : 'bg-gray-200'}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
          <p>{activeTab === 'all' ? "You haven't applied to any jobs yet." : `No applications with status "${activeTab}".`}</p>
          <Link to="/jobs" className="btn-primary inline-flex mt-4 text-sm">Browse jobs</Link>
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
