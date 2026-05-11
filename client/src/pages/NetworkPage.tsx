import { useSEO } from '../lib/useSEO';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, UserCheck, Sparkles } from 'lucide-react';
import PendingRequestsList from '../features/connections/PendingRequestsList';
import ConnectionsList from '../features/connections/ConnectionsList';
import PeopleYouMayKnow from '../features/connections/PeopleYouMayKnow';
import { usePendingRequests } from '../features/connections/useConnections';
type Tab = 'suggestions' | 'pending' | 'connections';
export default function NetworkPage() {
  useSEO({ title: 'My Network', description: 'Manage your professional connections on SkillSeal.', canonical: '/network' });
  const [tab, setTab] = useState<Tab>('suggestions'); const { data: pending = [] } = usePendingRequests();
  const TABS = [{ id: 'suggestions' as Tab, label: 'Grow your network', icon: <Sparkles size={16} /> }, { id: 'pending' as Tab, label: 'Invitations', icon: <Clock size={16} />, badge: pending.length }, { id: 'connections' as Tab, label: 'Connections', icon: <UserCheck size={16} /> }];
  return (<div className="max-w-4xl mx-auto px-4 py-6">
    <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center"><Users size={20} className="text-brand" /></div><div><h1 className="text-xl font-bold text-gray-900">My Network</h1><p className="text-sm text-gray-500">Manage your professional connections</p></div></div>
    <div className="flex gap-1 mb-6 border-b border-gray-200">
      {TABS.map(t => (<button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors relative ${tab === t.id ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
        {t.icon}{t.label}
        {t.badge !== undefined && t.badge > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{t.badge}</span>}
      </button>))}
    </div>
    <AnimatePresence mode="wait">
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
        {tab === 'suggestions' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-5"><div className="lg:col-span-2"><PeopleYouMayKnow /></div><div className="space-y-4"><div className="card p-5"><h3 className="font-semibold text-gray-800 text-sm mb-2">How SkillSeal connections work</h3><ul className="space-y-2 text-xs text-gray-500"><li className="flex gap-2"><span className="text-brand font-bold shrink-0">1st</span>People you're directly connected with</li><li className="flex gap-2"><span className="text-brand font-bold shrink-0">2nd</span>Friends of your connections</li><li className="flex gap-2"><span className="text-gray-500 font-bold shrink-0">3rd</span>Extended network</li></ul></div></div></div>}
        {tab === 'pending' && <PendingRequestsList />}
        {tab === 'connections' && <ConnectionsList />}
      </motion.div>
    </AnimatePresence>
  </div>);
}
