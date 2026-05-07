// ─────────────────────────────────────────────────────────────────────────────
// MessageRequests.tsx  –  tab for non-connection message requests
// ─────────────────────────────────────────────────────────────────────────────
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, CheckCircle2, X, Loader2, MessageSquareDashed } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useMessageRequests, useAcceptRequest, useIgnoreRequest,
} from './useMessaging';

export default function MessageRequests({ onAccepted }: { onAccepted?: () => void }) {
  const { data: requests = [], isLoading } = useMessageRequests();
  const accept = useAcceptRequest();
  const ignore = useIgnoreRequest();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16 text-gray-300">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
        <MessageSquareDashed size={40} className="opacity-40" />
        <p className="text-sm">No message requests</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      <div className="px-4 py-3 flex items-center gap-2 bg-amber-50 border-b border-amber-100">
        <Inbox size={15} className="text-amber-600" />
        <p className="text-xs text-amber-700 font-medium">
          {requests.length} message request{requests.length > 1 ? 's' : ''} from people you don't follow
        </p>
      </div>

      <AnimatePresence initial={false}>
        {requests.map((req) => (
          <motion.div
            key={req.threadId}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-3 px-4 py-4">
              {/* Avatar */}
              {req.participant.profilePhoto
                ? <img src={req.participant.profilePhoto} alt={req.participant.fullName} className="w-10 h-10 rounded-full object-cover shrink-0" />
                : <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400 shrink-0">{req.participant.fullName[0]}</div>
              }

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-gray-900">{req.participant.fullName}</p>
                  <span className="text-xs text-gray-400">
                    {req.lastMessage
                      ? formatDistanceToNow(new Date(req.lastMessage.createdAt), { addSuffix: true })
                      : ''}
                  </span>
                </div>
                {req.participant.headline && (
                  <p className="text-xs text-gray-500 truncate">{req.participant.headline}</p>
                )}
                {req.lastMessage && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{req.lastMessage.content}</p>
                )}

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={async () => {
                      await accept.mutateAsync(req.threadId);
                      onAccepted?.();
                    }}
                    disabled={accept.isPending}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    {accept.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Accept
                  </button>
                  <button
                    onClick={() => ignore.mutate(req.threadId)}
                    disabled={ignore.isPending}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 hover:border-red-300 hover:text-red-600"
                  >
                    <X size={12} /> Ignore
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
