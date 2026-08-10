import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUnreadCount } from './useNotifications';
import NotificationList from './NotificationList';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useUnreadCount();
  const count = data?.count ?? 0;
  const hasUnread = count > 0;

  // Use capture-phase 'click' so the button's onClick fires first,
  // then the outside-click handler closes the dropdown.
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', h, true);
    return () => document.removeEventListener('click', h, true);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative p-2 rounded-xl transition-colors ${
          open ? 'bg-brand/10 text-brand' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
        }`}
        aria-label="Notifications"
      >
        <motion.span
          animate={hasUnread && !open ? { rotate: [0, -10, 10, -8, 8, 0] } : { rotate: 0 }}
          transition={hasUnread ? { duration: 1.2, repeat: Infinity, repeatDelay: 4 } : { duration: 0 }}
          className="block origin-top"
        >
          <Bell size={20} />
        </motion.span>

        {hasUnread && (
          <>
            {/* Pulsing ring behind the badge */}
            <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-red-400/40 animate-ping pointer-events-none" />
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-seal-600 text-paper text-[10px] font-medium font-mono rounded-sm flex items-center justify-center px-1 ring-1 ring-paper-card">
              {count > 99 ? '99+' : count}
            </span>
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 w-[360px] max-w-[calc(100vw-1.5rem)] overflow-hidden flex flex-col max-h-[min(520px,calc(100vh-5rem))]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-paper-sunk shrink-0">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-brand" />
                <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
              </div>
              {hasUnread && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-red-500 bg-red-50 px-2 py-0.5 rounded-sm border border-red-100 tabular-nums">
                  {count} new
                </span>
              )}
            </div>

            {/* List */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <NotificationList />
            </div>

            {/* Footer */}
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-brand hover:bg-brand/5 border-t border-gray-100 transition-colors shrink-0"
            >
              View all notifications
              <ArrowRight size={13} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
