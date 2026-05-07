import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Users, Briefcase, MessageSquare, Bell, Search, LogOut, User, ShieldCheck, ChevronDown, LayoutDashboard, PenSquare, CreditCard } from 'lucide-react';
import { useAuthStore } from '../features/auth/useAuth';
import NotificationBell from '../features/notifications/NotificationBell';
import { useNotificationSocket } from '../features/notifications/useNotifications';
import { connectSocket, disconnectSocket } from './socketClient';
const NAV_ITEMS = [{ to: '/feed', icon: <Home size={20} />, label: 'Home' }, { to: '/network', icon: <Users size={20} />, label: 'Network' }, { to: '/jobs', icon: <Briefcase size={20} />, label: 'Jobs' }, { to: '/messages', icon: <MessageSquare size={20} />, label: 'Messages' }];
function AvatarMenu() {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null); const navigate = useNavigate(); const { user, logout } = useAuthStore();
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const handleLogout = async () => { await logout(); disconnectSocket(); navigate('/login'); };
  const u = user as unknown as { profilePhoto?: string; headline?: string; customUrl?: string; _id?: string; lastName?: string };
  return (<div ref={ref} className="relative">
    <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-gray-100">
      {u?.profilePhoto ? <img src={u.profilePhoto} alt={user?.firstName} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm">{user?.firstName?.[0] ?? 'U'}</div>}
      <ChevronDown size={14} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    <AnimatePresence>
      {open && (<motion.div initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.96 }} transition={{ type: 'spring', damping: 24, stiffness: 320 }} className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 min-w-[200px] py-1.5 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100"><p className="font-semibold text-sm text-gray-900">{user?.firstName} {u?.lastName}</p><p className="text-xs text-gray-500 truncate">{u?.headline ?? 'SkillSeal Member'}</p></div>
        <div className="py-1">
          <Link to={`/profile/${u?.customUrl || u?._id}`} onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><User size={15} />View profile</Link>
          <Link to="/assessment" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><ShieldCheck size={15} />Verify a skill</Link>
          <Link to="/applications" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><Briefcase size={15} />My applications</Link>
          <Link to="/recruiter" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><LayoutDashboard size={15} />Recruiter dashboard</Link>
          <Link to="/billing" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><CreditCard size={15} />Billing &amp; plan</Link>
        </div>
        <div className="border-t border-gray-100 py-1"><button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"><LogOut size={15} />Sign out</button></div>
      </motion.div>)}
    </AnimatePresence>
  </div>);
}
function GlobalSearch() {
  const [q, setQ] = useState(''); const [focused, setFocused] = useState(false); const navigate = useNavigate(); const handle = (e: React.FormEvent) => { e.preventDefault(); if (q.trim()) { navigate(`/jobs?keyword=${encodeURIComponent(q.trim())}`); setQ(''); setFocused(false); } };
  return (<form onSubmit={handle} className="relative"><div className={`flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 transition-all ${focused ? 'ring-2 ring-brand bg-white border border-brand/30' : ''}`}><Search size={15} className="text-gray-400 shrink-0" /><input value={q} onChange={e => setQ(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="Search jobs, people…" className="bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none w-52" /></div></form>);
}
export default function Layout({ children }: { children: React.ReactNode }) {
  useNotificationSocket();
  const { user, accessToken } = useAuthStore() as { user: unknown; accessToken: string | null; logout: () => Promise<void> };
  useEffect(() => { if (user && accessToken) connectSocket(accessToken); }, [accessToken]);
  return (<div className="min-h-screen bg-gray-50 flex flex-col">
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link to="/feed" className="flex items-center gap-2 shrink-0"><div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center"><ShieldCheck size={18} className="text-white" /></div><span className="font-bold text-gray-900 text-lg hidden sm:block">SkillSeal</span></Link>
        <div className="hidden md:block"><GlobalSearch /></div>
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {NAV_ITEMS.map(item => (<NavLink key={item.to} to={item.to} className={({ isActive }) => `flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-colors text-xs font-medium ${isActive ? 'text-brand border-b-2 border-brand rounded-none' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            {({ isActive }) => <><span className={isActive ? 'text-brand' : ''}>{item.icon}</span><span>{item.label}</span></>}
          </NavLink>))}
        </nav>
        <div className="flex items-center gap-2 ml-auto">
          <Link to="/feed" className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-brand border border-brand rounded-full px-3 py-1.5 hover:bg-blue-50"><PenSquare size={13} />Post</Link>
          <NotificationBell />
          <AvatarMenu />
        </div>
      </div>
    </header>
    <main className="flex-1 pb-20 md:pb-0">{children}</main>
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-1">
      {NAV_ITEMS.map(item => (<NavLink key={item.to} to={item.to} className={({ isActive }) => `flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl ${isActive ? 'text-brand' : 'text-gray-400'}`}>{item.icon}<span className="text-[10px] font-medium">{item.label}</span></NavLink>))}
      <NavLink to="/notifications" className={({ isActive }) => `flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl ${isActive ? 'text-brand' : 'text-gray-400'}`}><Bell size={20} /><span className="text-[10px] font-medium">Alerts</span></NavLink>
    </nav>
  </div>);
}
