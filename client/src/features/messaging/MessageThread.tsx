// ─────────────────────────────────────────────────────────────────────────────
// MessageThread.tsx  –  active thread view with infinite scroll upward
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import {
  useThread, useMarkRead, useMessagingStore,
} from './useMessaging';
import { useAuthStore } from '../auth/useAuth';
import type { IThreadSummary } from './messagingApi';

interface Props {
  thread:   IThreadSummary;
  onBack?:  () => void;   // mobile back
}

export default function MessageThread({ thread, onBack }: Props) {
  const currentUser  = useAuthStore((s) => s.user);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const topRef       = useRef<HTMLDivElement>(null);
  const liveMessages = useMessagingStore((s) => s.liveMessages[thread.threadId] ?? []);
  const typingState  = useMessagingStore((s) => s.typingState[thread.threadId]);
  const markRead     = useMarkRead();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useThread(thread.threadId);

  // Flatten pages (newest at end); pages are returned newest-first and reversed server-side
  const pagedMessages = data?.pages.flatMap((p) => p.messages) ?? [];
  const participant   = data?.pages[0]?.participant ?? thread.participant;

  // Merge paged + live (deduplicate by _id)
  const allIds   = new Set(pagedMessages.map((m) => m._id));
  const combined = [
    ...pagedMessages,
    ...liveMessages.filter((m) => !allIds.has(m._id)),
  ];

  // Mark read on open
  useEffect(() => {
    if (thread.unreadCount > 0) {
      markRead.mutate(thread.threadId);
    }
  }, [thread.threadId]); // eslint-disable-line

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [combined.length]);

  // Intersection observer for loading older messages (scroll to top sentinel)
  const handleTopObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleTopObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleTopObserver]);

  const isOwnMessage = (senderId: string) => senderId === currentUser?._id;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shrink-0">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 shrink-0">
            <ArrowLeft size={18} />
          </button>
        )}

        <div className="relative shrink-0">
          {participant.profilePhoto
            ? <img src={participant.profilePhoto} alt={participant.fullName} className="w-10 h-10 rounded-full object-cover" />
            : <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center font-bold text-brand">{participant.fullName[0]}</div>
          }
          {participant.isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{participant.fullName}</p>
          <p className="text-xs text-gray-400 truncate">
            {participant.isOnline ? (
              <span className="text-green-500">Online</span>
            ) : (
              participant.headline
            )}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
        {/* Sentinel for loading older messages */}
        <div ref={topRef} className="flex justify-center py-2">
          {isFetchingNextPage && <Loader2 size={18} className="animate-spin text-gray-300" />}
          {!hasNextPage && pagedMessages.length > 0 && (
            <span className="text-xs text-gray-300">Beginning of conversation</span>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-10 text-gray-300">
            <Loader2 size={24} className="animate-spin" />
          </div>
        )}

        {/* Date separators + bubbles */}
        {combined.map((msg, i) => {
          const prevMsg = combined[i - 1];
          const showDate = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

          return (
            <div key={msg._id}>
              {showDate && (
                <div className="flex justify-center my-3">
                  <span className="text-xs text-gray-400 bg-gray-50 rounded-full px-3 py-1">
                    {new Date(msg.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
              <MessageBubble
                message={msg}
                isOwn={isOwnMessage(msg.senderId)}
                threadId={thread.threadId}
              />
            </div>
          );
        })}

        {/* Typing indicator */}
        <AnimatePresence>
          {typingState?.isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-end gap-2"
            >
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm">
                <TypingIndicator />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput
        threadId={thread.threadId}
        recipientId={thread.participant._id}
      />
    </div>
  );
}
