// ─────────────────────────────────────────────────────────────────────────────
// ThreadList.tsx  –  sidebar thread list with search and unread badges
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, Loader2, SquarePen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useThreads, useMessagingStore } from './useMessaging';
import type { IThreadSummary } from './messagingApi';

interface Props {
  activeThreadId?: string;
  onSelect:        (thread: IThreadSummary) => void;
  onCompose:       () => void;
}

function Avatar({ src, name, isOnline }: { src: string; name: string; isOnline: boolean }) {
  return (
    <div className="relative shrink-0">
      {src
        ? <img src={src} alt={name} className="w-11 h-11 rounded-full object-cover" />
        : <div className="w-11 h-11 rounded-full bg-brand/10 flex items-center justify-center font-bold text-brand">{name[0]}</div>
      }
      {isOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
      )}
    </div>
  );
}

export default function ThreadList({ activeThreadId, onSelect, onCompose }: Props) {
  const [search, setSearch] = useState('');
  const { data: threads = [], isLoading } = useThreads();
  const onlineUsers = useMessagingStore((s) => s.onlineUsers);

  const filtered = search
    ? threads.filter((t) =>
        t.participant.fullName.toLowerCase().includes(search.toLowerCase()) ||
        t.lastMessage?.content.toLowerCase().includes(search.toLowerCase()),
      )
    : threads;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare size={18} className="text-brand" /> Messages
          </h2>
          <button
            onClick={onCompose}
            title="New message"
            className="p-1.5 rounded-lg text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors"
          >
            <SquarePen size={18} />
          </button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages…"
            className="input pl-8 py-1.5 text-sm w-full"
          />
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-10 text-gray-300">
            <Loader2 size={22} className="animate-spin" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="py-10 text-center text-gray-400 text-sm px-4">
            {search ? 'No conversations match.' : 'No messages yet. Start a conversation!'}
          </div>
        )}

        <AnimatePresence initial={false}>
          {filtered.map((thread) => {
            const isActive  = thread.threadId === activeThreadId;
            const isOnline  = onlineUsers.has(thread.participant._id);
            const hasUnread = thread.unreadCount > 0;

            return (
              <motion.button
                key={thread.threadId}
                layout
                onClick={() => onSelect(thread)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                  ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <Avatar
                  src={thread.participant.profilePhoto}
                  name={thread.participant.fullName}
                  isOnline={isOnline}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                      {thread.participant.fullName}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">
                      {thread.lastMessage
                        ? formatDistanceToNow(new Date(thread.lastMessage.createdAt), { addSuffix: false })
                        : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-xs truncate ${hasUnread ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                      {thread.lastMessage?.content ?? 'No messages yet'}
                    </p>
                    {hasUnread && (
                      <span className="ml-2 min-w-[18px] h-[18px] bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shrink-0">
                        {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
