import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Users, Briefcase, MessageSquare, Bell, Search,
  LogOut, User, ShieldCheck, ChevronDown, LayoutDashboard,
  PenSquare, CreditCard, ClipboardList, ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '../features/auth/useAuth';
import NotificationBell from '../features/notifications/NotificationBell';
import { useNotificationSocket } from '../features/notifications/useNotifications';
// PARTIAL-06: kept here for potential future use, but no longer called from
// Layout — see App.tsx for the top-level invocation that survives across
// route changes including the assessment overlay.
void useNotificationSocket;
import { useUnreadCount } from '../features/messaging/useMessaging';
import { connectSocket, disconnectSocket } from './socketClient';

const CANDIDATE_NAV = [
  { to: '/feed',       icon: <Home size={20} />,           label: 'Home' },
  { to: '/assessment', icon: <ShieldCheck size={20} />,    label: 'Verify' },
  { to: '/network',    icon: <Users size={20} />,          label: 'Network' },
  { to: '/jobs',       icon: <Briefcase size={20} />,      label: 'Jobs' },
  { to: '/messages',   icon: <MessageSquare size={20} />,  label: 'Messages' },
];

const RECRUITER_NAV = [
  { to: '/recruiter',  icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { to: '/jobs',       icon: <Briefcase size={20} />,       label: 'Jobs' },
  { to: '/network',    icon: <Users size={20} />,           label: 'Candidates' },
  { to: '/messages',   icon: <MessageSquare size={20} />,   label: 'Messages' },
];

const ADMIN_NAV = [
  { to: '/admin',      icon: <ShieldAlert size={20} />,     label: 'Admin' },
  { to: '/feed',       icon: <Home size={20} />,            label: 'Feed' },
  { to: '/network',    icon: <Users size={20} />,           label: 'Network' },
  { to: '/jobs',       icon: <Briefcase size={20} />,       label: 'Jobs' },
];

function AvatarMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const role = user?.role ?? 'candidate';
  const isRecruiter = role === 'recruiter' || role === 'company_admin';
  const isAdmin = role === 'platform_admin';

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = async () => { await logout(); disconnectSocket(); navigate('/login'); };
  const u = user as unknown as { profilePhoto?: string; headline?: string; customUrl?: string; _id?: string; lastName?: string };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-gray-100">
        {u?.profilePhoto
          ? <img src={u.profilePhoto} alt={user?.firstName} className="w-8 h-8 rounded-full object-cover" />
          : <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isRecruiter ? 'bg-indigo-100 text-indigo-600' : 'bg-brand/10 text-brand'}`}>{user?.firstName?.[0] ?? 'U'}</div>
        }
        <ChevronDown size={14} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 w-[230px] max-w-[calc(100vw-1.5rem)] py-1.5 overflow-y-auto max-h-[calc(100vh-5rem)]"
          >
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="font-semibold text-sm text-gray-900">{user?.firstName} {u?.lastName}</p>
              <p className="text-xs text-gray-500 truncate">{u?.headline ?? (isRecruiter ? 'Recruiter' : 'Candidate')}</p>
              <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${isAdmin ? 'bg-red-50 text-red-600' : isRecruiter ? 'bg-indigo-50 text-indigo-600' : 'bg-brand/10 text-brand'}`}>
                {isAdmin ? 'Platform admin' : isRecruiter ? 'Recruiter' : 'Candidate'}
              </span>
            </div>

            <div className="py-1">
              <Link to={`/profile/${u?.customUrl || u?._id}`} onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <User size={15} />View profile
              </Link>

              {isAdmin && (
                <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                  <ShieldAlert size={15} />Admin console
                </Link>
              )}

              {isRecruiter ? (
                <>
                  <Link to="/recruiter" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <LayoutDashboard size={15} />Recruiter dashboard
                  </Link>
                  <Link to="/billing" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <CreditCard size={15} />Billing &amp; plan
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/assessment" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <ShieldCheck size={15} />Verify a skill
                  </Link>
                  <Link to="/applications" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <ClipboardList size={15} />My applications
                  </Link>
                  <Link to="/billing" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <CreditCard size={15} />Billing &amp; plan
                  </Link>
                </>
              )}
            </div>

            <div className="border-t border-gray-100 py-1">
              <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                <LogOut size={15} />Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GlobalSearch({ isRecruiter }: { isRecruiter: boolean }) {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Context-aware search: route + placeholder depend on which page you're on.
  // - On /network → search PEOPLE (separate from job search entirely)
  // - On /jobs → search JOBS
  // - Anywhere else → default by role (recruiters → people, candidates → jobs)
  const onNetwork = location.pathname.startsWith('/network');
  const onJobs    = location.pathname.startsWith('/jobs');
  const mode: 'people' | 'jobs' =
    onNetwork ? 'people'
    : onJobs  ? 'jobs'
    : isRecruiter ? 'people'
    : 'jobs';

  const placeholder = mode === 'people' ? 'Search people…' : 'Search jobs…';

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const value = q.trim();
    if (!value) return;
    if (mode === 'people') {
      navigate(`/network?search=${encodeURIComponent(value)}`);
    } else {
      navigate(`/jobs?keyword=${encodeURIComponent(value)}`);
    }
    setQ(''); setFocused(false);
  };
  return (
    <form onSubmit={handle} className="relative">
      <div className={`flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 transition-all ${focused ? 'ring-2 ring-brand bg-white border border-brand/30' : ''}`}>
        <Search size={15} className="text-gray-400 shrink-0" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none w-52"
        />
      </div>
    </form>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  // PARTIAL-06: useNotificationSocket has moved to App.tsx so it stays
  // mounted during the assessment overlay (which renders without Layout).
  const { user, accessToken } = useAuthStore() as { user: typeof useAuthStore extends () => { user: infer U } ? U : unknown; accessToken: string | null; logout: () => Promise<void> };
  const role = (user as { role?: string })?.role ?? 'candidate';
  const isRecruiter = role === 'recruiter' || role === 'company_admin';
  const isAdmin = role === 'platform_admin';
  const navItems = isAdmin ? ADMIN_NAV : isRecruiter ? RECRUITER_NAV : CANDIDATE_NAV;
  const unreadMessages = useUnreadCount();

  useEffect(() => { if (user && accessToken) connectSocket(accessToken); }, [accessToken]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* Logo */}
          <Link to={isAdmin ? '/admin' : isRecruiter ? '/recruiter' : '/assessment'} className="flex items-center gap-2 shrink-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isAdmin ? 'bg-red-600' : isRecruiter ? 'bg-indigo-600' : 'bg-brand'}`}>
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg hidden sm:block">SkillSeal</span>
          </Link>

          <div className="hidden md:block">
            <GlobalSearch isRecruiter={isRecruiter} />
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors text-xs font-medium ${isActive
                    ? (isRecruiter ? 'text-indigo-600 border-b-2 border-indigo-600 rounded-none' : 'text-brand border-b-2 border-brand rounded-none')
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`relative ${isActive ? (isRecruiter ? 'text-indigo-600' : 'text-brand') : ''}`}>
                      {item.icon}
                      {item.to === '/messages' && unreadMessages > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                          {unreadMessages > 99 ? '99+' : unreadMessages}
                        </span>
                      )}
                    </span>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            {isAdmin ? (
              <Link
                to="/admin"
                className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-300 rounded-full px-3 py-1.5 hover:bg-red-50"
              >
                <ShieldAlert size={13} />Admin
              </Link>
            ) : isRecruiter ? (
              <Link
                to="/recruiter"
                className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-indigo-600 border border-indigo-400 rounded-full px-3 py-1.5 hover:bg-indigo-50"
              >
                <LayoutDashboard size={13} />Dashboard
              </Link>
            ) : (
              <Link
                to="/assessment"
                className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-brand border border-brand rounded-full px-3 py-1.5 hover:bg-blue-50"
              >
                <ShieldCheck size={13} />Verify Skill
              </Link>
            )}
            <NotificationBell />
            <AvatarMenu />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl ${isActive ? (isRecruiter ? 'text-indigo-600' : 'text-brand') : 'text-gray-400'}`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`relative ${isActive ? (isRecruiter ? 'text-indigo-600' : 'text-brand') : 'text-gray-400'}`}>
                  {item.icon}
                  {item.to === '/messages' && unreadMessages > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl ${isActive ? (isRecruiter ? 'text-indigo-600' : 'text-brand') : 'text-gray-400'}`
          }
        >
          <Bell size={20} />
          <span className="text-[10px] font-medium">Alerts</span>
        </NavLink>
      </nav>
    </div>
  );
}
