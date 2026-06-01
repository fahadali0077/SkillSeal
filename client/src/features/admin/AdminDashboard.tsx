import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, ShieldCheck, Layers, Flag, ShieldAlert } from 'lucide-react';
import { useSEO } from '../../lib/useSEO';
import AdminOverview from './AdminOverview';
import AdminUsers from './AdminUsers';
import AdminVerifications from './AdminVerifications';
import AdminSkills from './AdminSkills';
import AdminModeration from './AdminModeration';

type Tab = 'overview' | 'users' | 'verifications' | 'skills' | 'moderation';

const TABS = [
  { id: 'overview' as Tab, label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { id: 'users' as Tab, label: 'Users', icon: <Users size={16} /> },
  { id: 'verifications' as Tab, label: 'Verifications', icon: <ShieldCheck size={16} /> },
  { id: 'skills' as Tab, label: 'Skills', icon: <Layers size={16} /> },
  { id: 'moderation' as Tab, label: 'Moderation', icon: <Flag size={16} /> },
];

export default function AdminDashboard() {
  useSEO({ title: 'Admin · SkillSeal', description: 'Platform administration for SkillSeal.' });
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div className="flex items-center gap-3 mb-5 sm:mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
          <ShieldAlert size={20} className="text-red-600" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Admin Console</h1>
          <p className="text-xs sm:text-sm text-gray-500 truncate">Platform health, moderation, and the skill catalog</p>
        </div>
      </div>

      {/* Tab bar — bleeds to screen edges on mobile so horizontal scroll feels natural */}
      <div className="flex gap-1 mb-5 sm:mb-6 border-b border-gray-200 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
          {tab === 'overview' && <AdminOverview />}
          {tab === 'users' && <AdminUsers />}
          {tab === 'verifications' && <AdminVerifications />}
          {tab === 'skills' && <AdminSkills />}
          {tab === 'moderation' && <AdminModeration />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
