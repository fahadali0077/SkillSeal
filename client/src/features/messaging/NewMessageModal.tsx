// ─────────────────────────────────────────────────────────────────────────────
// NewMessageModal.tsx  –  connection picker for starting a new conversation
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2 } from 'lucide-react';
import { connectionsApi, type UserMini } from '../connections/connectionsApi';

interface Props {
  open:     boolean;
  onClose:  () => void;
  onSelect: (userId: string) => void;
}

export default function NewMessageModal({ open, onClose, onSelect }: Props) {
  const [query, setQuery]           = useState('');
  const [connections, setConnections] = useState<UserMini[]>([]);
  const [loading, setLoading]       = useState(false);
  const inputRef                    = useRef<HTMLInputElement>(null);

  // Fetch connections (with optional search) whenever query changes
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    connectionsApi.list({ search: query || undefined, limit: 20 })
      .then((res) => setConnections(res.connections))
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  }, [query, open]);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSelect = (userId: string) => {
    onSelect(userId);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-40"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-x-4 top-24 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:top-28 md:w-[420px] z-50 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">New Message</h3>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-shadow">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your connections…"
                  className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                />
                {loading && <Loader2 size={14} className="animate-spin text-gray-300 shrink-0" />}
              </div>
            </div>

            {/* Results */}
            <div className="max-h-72 overflow-y-auto">
              {!loading && connections.length === 0 && (
                <div className="py-10 text-center text-sm text-gray-400">
                  {query ? 'No connections match.' : 'No connections yet.'}
                </div>
              )}

              {connections.map((user) => {
                const initials = user.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <button
                    key={user._id}
                    onClick={() => handleSelect(user._id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    {user.profilePhoto
                      ? <img src={user.profilePhoto} alt={user.fullName} className="w-10 h-10 rounded-full object-cover shrink-0" />
                      : <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center font-bold text-brand text-sm shrink-0">{initials}</div>
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.fullName}</p>
                      {user.headline && (
                        <p className="text-xs text-gray-400 truncate">{user.headline}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
