import { useSEO } from '../lib/useSEO';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, UserCheck, Sparkles, Send, Search, XCircle } from 'lucide-react';
import PendingRequestsList from '../features/connections/PendingRequestsList';
import ConnectionsList from '../features/connections/ConnectionsList';
import PeopleYouMayKnow from '../features/connections/PeopleYouMayKnow';
import PeopleSearchResults from '../features/connections/PeopleSearchResults';
import { usePendingRequests } from '../features/connections/useConnections';

type Tab = 'suggestions' | 'pending' | 'connections';

export default function NetworkPage() {
  useSEO({
    title: 'My Network',
    description: 'Manage your professional connections on SkillSeal.',
    canonical: '/network',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) ?? 'suggestions';
  const [tab, setTab] = useState<Tab>(initialTab);
  const { data: pending = [] } = usePendingRequests();

  // ── Top-level people search ────────────────────────────────────────────
  // Lives above the tabs, completely independent from the job search on
  // /jobs. The URL is the source of truth (so navbar deep-links like
  // /network?search=John work), and we mirror it into local state for the
  // controlled input.
  const urlSearch = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(urlSearch);

  // Keep input in sync if URL changes from outside (e.g. navbar submit).
  useEffect(() => { setSearchInput(urlSearch); }, [urlSearch]);

  // Push input changes into the URL so the search is shareable / bookmarkable
  // and survives page reloads. Debounce so we don't spam history entries —
  // 300 ms matches the hook's debounce so input/URL/query stay aligned.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (searchInput.trim()) {
        next.set('search', searchInput.trim());
      } else {
        next.delete('search');
      }
      // Don't push a new entry on every keystroke — replace the current one.
      setSearchParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const isSearching = searchInput.trim().length > 0;

  const TABS = [
    { id: 'suggestions' as Tab, label: 'Grow your network', icon: <Sparkles size={15} /> },
    { id: 'pending'     as Tab, label: 'Invitations',       icon: <Clock size={15} />, badge: pending.length },
    { id: 'connections' as Tab, label: 'Connections',       icon: <UserCheck size={15} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">

      {/* ── Gradient hero ───────────────────────────────────────────────── */}
      <div className="mb-6 pb-4 border-b border-paper-line">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded border border-paper-line bg-paper-sunk text-ink-700 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <h1 className="font-display text-[28px] leading-none text-ink-900">My Network</h1>
            <p className="text-sm text-ink-500 mt-2">Grow your professional circle on SkillSeal</p>
          </div>
        </div>
      </div>

      {/* ── People search bar (above tabs, always visible) ──────────────── */}
      <div className="card p-2.5 mb-5">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search people by name, headline, or skill…"
            className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand/10 rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none transition-all"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
              aria-label="Clear search"
            >
              <XCircle size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── Search mode: results replace the tabs ───────────────────────── */}
      {isSearching ? (
        <motion.div
          key="search"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <PeopleSearchResults q={searchInput} />
        </motion.div>
      ) : (
        <>
          {/* ── Pill tabs ───────────────────────────────────────────────── */}
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
                  <span className={`ml-0.5 text-[10px] font-bold rounded-sm min-w-[18px] h-[18px] flex items-center justify-center px-1 ${
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
                    <div className="card p-5 bg-paper-sunk border-blue-100">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <Users size={15} className="text-brand" />
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm">How connections work</h3>
                      </div>
                      <ul className="space-y-3 text-xs text-gray-600">
                        <li className="flex items-start gap-2.5">
                          <span className="mt-0.5 w-6 h-6 rounded-full bg-seal-600 text-paper text-[10px] font-medium font-mono flex items-center justify-center shrink-0 shadow-sm">1st</span>
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
        </>
      )}
    </div>
  );
}
