import { useSEO } from '../lib/useSEO';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, UserCheck, Sparkles, Send } from 'lucide-react';
import PendingRequestsList from '../features/connections/PendingRequestsList';
import ConnectionsList from '../features/connections/ConnectionsList';
import PeopleYouMayKnow from '../features/connections/PeopleYouMayKnow';
import { usePendingRequests } from '../features/connections/useConnections';

type Tab = 'suggestions' | 'pending' | 'connections';

export default function NetworkPage() {
  useSEO({
    title: 'My Network',
    description: 'Manage your professional connections on SkillSeal.',
    canonical: '/network',
  });

  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) ?? 'suggestions';
  const [tab, setTab] = useState<Tab>(initialTab);
  const { data: pending = [] } = usePendingRequests();

  const TABS = [
    { id: 'suggestions' as Tab, label: 'Grow your network', icon: <Sparkles size={15} /> },
    { id: 'pending'     as Tab, label: 'Invitations',       icon: <Clock size={15} />, badge: pending.length },
    { id: 'connections' as Tab, label: 'Connections',       icon: <UserCheck size={15} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">

      {/* ── Gradient hero ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand-light to-indigo-600 text-white p-5 sm:p-6 mb-5">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">My Network</h1>
            <p className="text-white/80 text-sm mt-0.5">Grow your professional circle on SkillSeal</p>
          </div>
        </div>
        {/* Decorative orbs */}
        <div className="absolute -right-8 -top-12 w-44 h-44 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-44 h-44 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      </div>

      {/* ── Pill tabs ───────────────────────────────────────────────────── */}
      <div className="card p-1 mb-5 inline-flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl transition-all relative ${
              tab === t.id
                ? 'bg-brand text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.label.split(' ')[0]}</span>
            {t.badge !== undefined && t.badge > 0 && (
              <span className={`ml-0.5 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${
                tab === t.id ? 'bg-white text-brand' : 'bg-red-500 text-white'
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {tab === 'suggestions' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <PeopleYouMayKnow />
              </div>

              <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                <div className="card p-5 bg-gradient-to-br from-blue-50/60 to-indigo-50/60 border-blue-100">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <Users size={15} className="text-brand" />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm">How connections work</h3>
                  </div>
                  <ul className="space-y-3 text-xs text-gray-600">
                    <li className="flex items-start gap-2.5">
                      <span className="mt-0.5 w-6 h-6 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm">1st</span>
                      <span className="leading-relaxed pt-0.5">People you're directly connected with</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-0.5 w-6 h-6 rounded-full bg-blue-200 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0">2nd</span>
                      <span className="leading-relaxed pt-0.5">Friends of your connections</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="mt-0.5 w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold flex items-center justify-center shrink-0">3rd</span>
                      <span className="leading-relaxed pt-0.5">Extended professional network</span>
                    </li>
                  </ul>
                  <div className="mt-4 pt-3 border-t border-blue-100 flex items-center gap-2">
                    <Send size={12} className="text-brand" />
                    <p className="text-xs text-gray-600">
                      Up to <span className="font-bold text-brand">100 requests/week</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'pending'     && <PendingRequestsList />}
          {tab === 'connections' && <ConnectionsList />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
