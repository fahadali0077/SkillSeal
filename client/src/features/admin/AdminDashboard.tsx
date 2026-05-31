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
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
          <ShieldAlert size={20} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Console</h1>
          <p className="text-sm text-gray-500">Platform health, user moderation, and the skill catalog</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
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
