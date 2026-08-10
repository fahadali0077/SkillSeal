// ─────────────────────────────────────────────────────────────────────────────
// ConfirmDialog.tsx  –  styled confirmation modal (replaces native confirm())
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  open:      boolean;
  title:     string;
  message?:  string;
  confirmLabel?: string;
  cancelLabel?:  string;
  variant?:  'danger' | 'warning' | 'info';
  loading?:  boolean;
  onConfirm: () => void;
  onCancel:  () => void;
}

const VARIANTS = {
  danger:  { iconBg: 'bg-red-100',    iconColor: 'text-red-600',    confirm: 'bg-red-600 hover:bg-red-700 text-white' },
  warning: { iconBg: 'bg-amber-100',  iconColor: 'text-amber-600',  confirm: 'bg-amber-600 hover:bg-amber-700 text-white' },
  info:    { iconBg: 'bg-blue-100',   iconColor: 'text-blue-600',   confirm: 'bg-brand hover:bg-brand-dark text-white' },
};

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'info', loading = false, onConfirm, onCancel,
}: Props) {
  const v = VARIANTS[variant];

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
      if (e.key === 'Enter'  && !loading) onConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, loading, onConfirm, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={!loading ? onCancel : undefined}
            className="fixed inset-0 bg-black/40 z-50"
          />
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92%] max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
          >
            <button
              onClick={onCancel}
              disabled={loading}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 z-10"
            >
              <X size={16} />
            </button>

            <div className="p-6 overflow-y-auto min-h-0">
              <div className={`w-12 h-12 rounded-full ${v.iconBg} flex items-center justify-center mb-4`}>
                <AlertTriangle size={22} className={v.iconColor} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1 pr-8">{title}</h3>
              {message && <p className="text-sm text-gray-600 leading-relaxed">{message}</p>}
            </div>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-2 border-t border-gray-100 shrink-0">
              <button onClick={onCancel} disabled={loading} className="btn-secondary text-sm py-2 px-4">
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`inline-flex items-center justify-center gap-2 font-semibold px-4 py-2 rounded-xl text-sm transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed ${v.confirm}`}
              >
                {loading ? 'Working…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
