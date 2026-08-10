import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LogOut, User, ChevronDown, CreditCard, ClipboardList, Bell } from 'lucide-react';
import { useAuthStore } from '../features/auth/useAuth';
import NotificationBell from '../features/notifications/NotificationBell';
import { useNotificationSocket } from '../features/notifications/useNotifications';
// PARTIAL-06: kept here for potential future use, but no longer called from
// Layout — see App.tsx for the top-level invocation that survives across
// route changes including the assessment overlay.
void useNotificationSocket;
import { useUnreadCount } from '../features/messaging/useMessaging';
import { connectSocket, disconnectSocket } from './socketClient';
import SealMark from '../components/SealMark';
import { enter } from './motion';

// Text nav, not icon-over-label. The bar should read as a document header.
const CANDIDATE_NAV = [
  { to: '/feed',       label: 'Home' },
  { to: '/assessment', label: 'Verify' },
  { to: '/network',    label: 'Network' },
  { to: '/jobs',       label: 'Jobs' },
  { to: '/messages',   label: 'Messages' },
];

const RECRUITER_NAV = [
  { to: '/recruiter',  label: 'Dashboard' },
  { to: '/network',    label: 'Talent search' },
  { to: '/jobs',       label: 'Jobs' },
  { to: '/messages',   label: 'Messages' },
];

const ADMIN_NAV = [
  { to: '/admin',      label: 'Console' },
  { to: '/feed',       label: 'Feed' },
  { to: '/network',    label: 'Network' },
  { to: '/jobs',       label: 'Jobs' },
];

function Count({ n }: { n: number }) {
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-sm bg-seal-600 text-paper font-mono text-[10px] font-medium tabular-nums">
      {n > 99 ? '99+' : n}
    </span>
  );
}

// ── Context strip ────────────────────────────────────────────────────────────
// Role is declared in a thin strip rather than by recoloring the whole chrome.
// Recruiters and admins see the same product, differently labelled.
function ContextStrip({ label, detail }: { label: string; detail?: string }) {
  return (
    <div className="bg-ink-900 text-paper">
      <div className="max-w-6xl mx-auto px-4 h-8 flex items-center gap-3">
        <span className="font-mono text-[10px] font-medium tracking-[0.12em] uppercase">
          {label}
        </span>
        {detail && (
          <>
            <span className="text-ink-400 text-[10px]">·</span>
            <span className="font-mono text-[10px] tracking-[0.06em] text-ink-300 truncate">{detail}</span>
          </>
        )}
      </div>
    </div>
  );
}

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
  const u = user as unknown as {
    profilePhoto?: string; headline?: string; customUrl?: string;
    _id?: string; lastName?: string;
  };

  const roleLabel = isAdmin ? 'Platform admin' : isRecruiter ? 'Recruiter' : 'Candidate';
  const item = 'flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-paper-sunk transition-colors';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 p-1 rounded hover:bg-paper-sunk transition-colors"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {u?.profilePhoto
          ? <img src={u.profilePhoto} alt={user?.firstName} className="w-8 h-8 rounded-full object-cover border border-paper-line" />
          : <div className="w-8 h-8 rounded-full bg-ink-800 text-paper flex items-center justify-center font-mono text-[11px] font-medium tracking-wide">
              {(user?.firstName?.[0] ?? 'U')}{(u?.lastName?.[0] ?? '')}
            </div>
        }
        <ChevronDown size={14} className={`text-ink-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            {...enter}
            className="absolute right-0 top-full mt-2 bg-paper-card border border-paper-rule rounded-lg shadow-pop z-50 w-[248px] max-w-[calc(100vw-1.5rem)] overflow-hidden"
            role="menu"
          >
            <div className="px-4 py-3.5 border-b border-paper-line">
              <p className="font-display text-base text-ink-900 leading-tight">
                {user?.firstName} {u?.lastName}
              </p>
              <p className="text-xs text-ink-500 truncate mt-0.5">
                {u?.headline ?? roleLabel}
              </p>
              <span className="label mt-2 inline-block">{roleLabel}</span>
            </div>

            <div className="py-1">
              <Link to={`/profile/${u?.customUrl || u?._id}`} onClick={() => setOpen(false)} className={item}>
                <User size={16} />View profile
              </Link>

              {isAdmin && (
                <Link to="/admin" onClick={() => setOpen(false)} className={item}>
                  <ClipboardList size={16} />Admin console
                </Link>
              )}

              {isRecruiter ? (
                <Link to="/recruiter" onClick={() => setOpen(false)} className={item}>
                  <ClipboardList size={16} />Recruiter workspace
                </Link>
              ) : (
                <>
                  <Link to="/assessment" onClick={() => setOpen(false)} className={item}>
                    <SealMark size={16} tone="seal" />Verify a skill
                  </Link>
                  <Link to="/applications" onClick={() => setOpen(false)} className={item}>
                    <ClipboardList size={16} />My applications
                  </Link>
                </>
              )}

              <Link to="/billing" onClick={() => setOpen(false)} className={item}>
                <CreditCard size={16} />Billing &amp; plan
              </Link>
            </div>

            <div className="border-t border-paper-line py-1">
              <button onClick={handleLogout} className={`${item} w-full text-ink-500 hover:text-ink-900`}>
                <LogOut size={16} />Sign out
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
  const navigate = useNavigate();
  const location = useLocation();

  // Context-aware search: route + placeholder depend on which page you're on.
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
    navigate(mode === 'people'
      ? `/network?search=${encodeURIComponent(value)}`
      : `/jobs?keyword=${encodeURIComponent(value)}`);
    setQ('');
  };

  return (
    <form onSubmit={handle} className="relative">
      <div className="flex items-center gap-2 bg-paper-sunk border border-paper-line rounded px-3 py-2 focus-within:border-ink-800 focus-within:bg-paper-card transition-colors duration-150">
        <Search size={16} className="text-ink-400 shrink-0" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="bg-transparent text-sm text-ink-900 placeholder:text-ink-400 outline-none w-44 lg:w-52"
        />
      </div>
    </form>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  // PARTIAL-06: useNotificationSocket has moved to App.tsx so it stays
  // mounted during the assessment overlay (which renders without Layout).
  const { user, accessToken } = useAuthStore() as {
    user: typeof useAuthStore extends () => { user: infer U } ? U : unknown;
    accessToken: string | null;
    logout: () => Promise<void>;
  };
  const role = (user as { role?: string })?.role ?? 'candidate';
  const company = (user as { companyName?: string })?.companyName;
  const isRecruiter = role === 'recruiter' || role === 'company_admin';
  const isAdmin = role === 'platform_admin';
  const navItems = isAdmin ? ADMIN_NAV : isRecruiter ? RECRUITER_NAV : CANDIDATE_NAV;
  const unreadMessages = useUnreadCount();

  useEffect(() => { if (user && accessToken) connectSocket(accessToken); }, [accessToken]);

  const home = isAdmin ? '/admin' : isRecruiter ? '/recruiter' : '/feed';

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {isAdmin && <ContextStrip label="Platform administration" detail="elevated session" />}
      {isRecruiter && <ContextStrip label="Recruiter workspace" detail={company} />}

      <header className="sticky top-0 z-40 bg-paper-card border-b border-paper-rule">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-5">
          <Link to={home} className="flex items-center gap-2.5 shrink-0" aria-label="SkillSeal home">
            <SealMark size={26} tone="seal" />
            <span className="font-display font-medium text-[19px] leading-none tracking-[-0.015em] text-ink-900 hidden sm:block">
              SkillSeal
            </span>
          </Link>

          <div className="hidden lg:block">
            <GlobalSearch isRecruiter={isRecruiter} />
          </div>

          {/* Desktop nav — plain text with an inset underline on the active item */}
          <nav className="hidden md:flex items-stretch gap-7 flex-1 justify-center h-16">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link flex items-center ${isActive ? 'nav-link-active' : ''}`}
              >
                {item.label}
                {item.to === '/messages' && unreadMessages > 0 && <Count n={unreadMessages} />}
              </NavLink>
            ))}
          </nav>

          {/* The one oxblood button per screen is always the issuance action. */}
          <div className="flex items-center gap-3 ml-auto">
            {!isRecruiter && !isAdmin && (
              <Link to="/assessment" className="hidden md:inline-flex btn-seal py-2 px-3.5">
                Verify a skill
              </Link>
            )}
            {isRecruiter && (
              <Link to="/jobs" className="hidden md:inline-flex btn-seal py-2 px-3.5">
                Post a role
              </Link>
            )}
            <NotificationBell />
            <AvatarMenu />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-16 md:pb-0">{children}</main>

      {/* Mobile bottom nav — text labels, same underline logic as desktop */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-paper-card border-t border-paper-rule flex items-stretch justify-around">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative flex items-center justify-center px-2 py-3.5 text-[11px] font-medium transition-colors
               ${isActive ? 'text-ink-900 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-ink-800' : 'text-ink-400'}`
            }
          >
            {item.label}
            {item.to === '/messages' && unreadMessages > 0 && <Count n={unreadMessages} />}
          </NavLink>
        ))}
        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `relative flex items-center justify-center px-3 py-3.5 transition-colors
             ${isActive ? 'text-ink-900 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-ink-800' : 'text-ink-400'}`
          }
          aria-label="Alerts"
        >
          <Bell size={17} />
        </NavLink>
      </nav>
    </div>
  );
}
