// ─────────────────────────────────────────────────────────────────────────────
// NotificationsPage.tsx  –  full-page notifications view
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Sparkles, Loader2 } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import { useSEO } from '../../lib/useSEO';
import { useNotifications, useMarkAllRead, NOTIF_KEY, notificationsApi } from './useNotifications';
import NotificationItem from './NotificationItem';

type Tab = 'all' | 'unread';

export default function NotificationsPage() {
  useSEO({ title: 'Notifications', description: 'Stay up to date with activity on SkillSeal.', canonical: '/notifications' });

  // PARTIAL-08: client-side "Load more" pagination. We keep all pages in
  // parallel useQuery instances keyed by page number, then flatten the
  // notifications array. Lets users walk back through history beyond the
  // first page that useNotifications() ships by default.
  const [pageCount, setPageCount] = useState(1);
  const pages = useQueries({
    queries: Array.from({ length: pageCount }, (_, i) => ({
      queryKey: [...NOTIF_KEY, i + 1],
      queryFn: () => notificationsApi.list(i + 1),
      staleTime: 30_000,
    })),
  });

  const isLoading = pages.some((p) => p.isLoading);
  const isFetchingMore = pages[pages.length - 1]?.isFetching && pageCount > 1;
  const notifications = useMemo(
    () => pages.flatMap((p) => p.data?.notifications ?? []),
    [pages],
  );
  const lastPage = pages[pages.length - 1]?.data;
  const total = lastPage?.total ?? 0;
  const hasMore = notifications.length < total;
  const unreadCount = pages[0]?.data?.unreadCount ?? 0;
  // Keep useNotifications imported (lint placeholder).
  void useNotifications;

  const markAll = useMarkAllRead();

  const [tab, setTab] = useState<Tab>('all');
  const filtered = tab === 'unread' ? notifications.filter(n => !n.isRead) : notifications;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">

      {/* ── Gradient hero ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand-light to-indigo-600 text-white p-5 sm:p-6 mb-5">
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0 relative">
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-brand">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Notifications</h1>
              <p className="text-white/80 text-sm mt-0.5">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                  : "You're all caught up"}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur text-white font-medium text-xs px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>
        <div className="absolute -right-8 -top-12 w-44 h-44 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-44 h-44 rounded-full bg-white/5 blur-3xl pointer-events-none" />
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────────────── */}
      <div className="card p-1.5 mb-5 inline-flex gap-1">
        {([
          { id: 'all'    as Tab, label: 'All',    count: notifications.length },
          { id: 'unread' as Tab, label: 'Unread', count: unreadCount },
        ]).map(t => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg transition-all ${
                isActive ? 'bg-brand text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
                  isActive ? 'bg-white/25' : 'bg-gray-200 text-gray-600'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Notification list ───────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <div className="skeleton w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-3/4 rounded" />
                  <div className="skeleton h-2.5 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand/15 to-brand/5 flex items-center justify-center">
              {tab === 'unread' ? (
                <Sparkles size={26} className="text-amber-500" />
              ) : (
                <Bell size={26} className="text-brand" />
              )}
            </div>
            <p className="font-bold text-gray-900 mb-1">
              {tab === 'unread' ? "You're all caught up" : 'No notifications yet'}
            </p>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              {tab === 'unread'
                ? 'No unread notifications. Switch to "All" to see your history.'
                : "When people interact with you or your content, you'll see updates here."}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="divide-y divide-gray-100">
              {filtered.map((n, i) => (
                <motion.div
                  key={n._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.25) }}
                >
                  <NotificationItem notification={n} />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* PARTIAL-08: Load more button — only shown when more pages remain. */}
      {!isLoading && hasMore && (
        <div className="flex justify-center mt-5">
          <button
            onClick={() => setPageCount((p) => p + 1)}
            disabled={isFetchingMore}
            className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-60"
          >
            {isFetchingMore && <Loader2 size={14} className="animate-spin" />}
            {isFetchingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
