// ─────────────────────────────────────────────────────────────────────────────
// MessagingPage.tsx
// Split view: thread list left, active thread right.
// Mobile: full-screen per view with back navigation.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareDashed, Inbox } from 'lucide-react';
import ThreadList from './ThreadList';
import MessageThread from './MessageThread';
import MessageRequests from './MessageRequests';
import { useSocketEvents, useMessagingStore } from './useMessaging';
import type { IThreadSummary } from './messagingApi';

type Tab = 'messages' | 'requests';

export default function MessagingPage() {
  // Register socket event listeners for this page
  useSocketEvents();

  const [params, setParams]         = useSearchParams();
  const [activeThread, setActive]   = useState<IThreadSummary | null>(null);
  const [activeTab, setActiveTab]   = useState<Tab>('messages');
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list');
  const requestCount = useMessagingStore((s) =>
    Object.values(s.liveMessages).flat().filter((m) => m.isInMailMessage).length,
  );

  // Open thread from URL param (?thread=threadId)
  const threadParam = params.get('thread');

  const selectThread = (thread: IThreadSummary) => {
    setActive(thread);
    setMobileView('thread');
    setParams({ thread: thread.threadId }, { replace: true });
  };

  const goBack = () => {
    setMobileView('list');
    setActive(null);
    setParams({}, { replace: true });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 h-[calc(100vh-80px)]">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-full overflow-hidden flex">

        {/* ── Left panel: thread list ─────────────────────────────────────── */}
        <div className={`
          w-full md:w-80 lg:w-96 border-r border-gray-100 flex flex-col shrink-0
          ${mobileView === 'thread' ? 'hidden md:flex' : 'flex'}
        `}>
          {/* Tabs */}
          <div className="flex px-4 pt-4 gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-colors
                ${activeTab === 'messages' ? 'bg-brand text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              Messages
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-colors relative
                ${activeTab === 'requests' ? 'bg-brand text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              Requests
              {requestCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {requestCount > 9 ? '9+' : requestCount}
                </span>
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'messages' ? (
                <motion.div
                  key="messages"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="h-full"
                >
                  <ThreadList
                    activeThreadId={activeThread?.threadId}
                    onSelect={selectThread}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="requests"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                >
                  <MessageRequests onAccepted={() => setActiveTab('messages')} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right panel: active thread ──────────────────────────────────── */}
        <div className={`
          flex-1 flex flex-col min-w-0
          ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}
        `}>
          <AnimatePresence mode="wait">
            {activeThread ? (
              <motion.div
                key={activeThread.threadId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col"
              >
                <MessageThread
                  thread={activeThread}
                  onBack={goBack}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300 p-8"
              >
                <MessageSquareDashed size={52} className="opacity-40" />
                <p className="text-sm font-medium text-gray-400">Select a conversation</p>
                <p className="text-xs text-gray-300 text-center">
                  Choose from your messages on the left or start a new conversation from a profile.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
