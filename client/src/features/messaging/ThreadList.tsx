// ─────────────────────────────────────────────────────────────────────────────
// ThreadList.tsx  –  sidebar thread list with search and unread badges
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, SquarePen, XCircle, Inbox } from 'lucide-react';
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
        ? <img src={src} alt={name} className="w-11 h-11 rounded-full object-cover ring-1 ring-paper-card" />
        : <div className="w-11 h-11 rounded-full bg-paper-sunk flex items-center justify-center font-bold text-brand ring-1 ring-paper-card">{name[0]}</div>
      }
      {isOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-white" />
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
      <div className="px-4 pt-3 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 text-base">
            <MessageSquare size={17} className="text-brand" /> Messages
          </h2>
          <button
            onClick={onCompose}
            title="New message"
            className="p-2 rounded-lg text-gray-500 hover:text-brand hover:bg-brand/10 transition-colors"
          >
            <SquarePen size={17} />
          </button>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages…"
            className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand/10 rounded-lg pl-8 pr-8 py-2 text-sm outline-none transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded">
              <XCircle size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="divide-y divide-gray-50">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="skeleton w-11 h-11 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-32 rounded" />
                  <div className="skeleton h-2.5 w-44 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="py-12 text-center px-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Inbox size={24} className="text-gray-400" />
            </div>
            <p className="font-semibold text-gray-700 mb-1 text-sm">
              {search ? 'No matches' : 'No messages yet'}
            </p>
            <p className="text-xs text-gray-400">
              {search
                ? `Nothing matches "${search}"`
                : 'Start a conversation from someone\'s profile.'}
            </p>
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
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors relative
                  ${isActive ? 'bg-brand/8' : 'hover:bg-gray-50'}`}
              >
                {/* Active indicator stripe */}
                {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-brand rounded-full" />}

                <Avatar
                  src={thread.participant.profilePhoto}
                  name={thread.participant.fullName}
                  isOnline={isOnline}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                      {thread.participant.fullName}
                    </span>
                    <span className={`text-[11px] shrink-0 ml-2 tabular-nums ${hasUnread ? 'text-brand font-semibold' : 'text-gray-400'}`}>
                      {thread.lastMessage
                        ? formatDistanceToNow(new Date(thread.lastMessage.createdAt), { addSuffix: false })
                        : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-xs truncate ${hasUnread ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                      {thread.lastMessage?.content ?? 'No messages yet'}
                    </p>
                    {hasUnread && (
                      <span className="ml-2 min-w-[18px] h-[18px] bg-seal-600 text-paper text-[10px] font-medium font-mono rounded-sm flex items-center justify-center px-1 shrink-0 tabular-nums">
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
