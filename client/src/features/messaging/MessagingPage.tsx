// ─────────────────────────────────────────────────────────────────────────────
// MessagingPage.tsx
// Split view: thread list left, active thread right.
// Mobile: full-screen per view with back navigation.
// Supports ?userId=<id> (from profile "Message" button) to auto-open or
// start a new conversation with that user.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareDashed, Send, Loader2, ArrowLeft } from 'lucide-react';
import ThreadList from './ThreadList';
import MessageThread from './MessageThread';
import MessageRequests from './MessageRequests';
import NewMessageModal from './NewMessageModal';
import { useSocketEvents, useMessagingStore, useMessageRequestCount, useThreads, useSendMessage } from './useMessaging';
import type { IThreadSummary } from './messagingApi';
import { profileApi } from '../profile/profileApi';
import { useSEO } from '../../lib/useSEO';

type Tab = 'messages' | 'requests';

// ── New-conversation panel (no existing thread yet) ───────────────────────────
function NewConversationPanel({
  recipientId,
  onThreadCreated,
  onBack,
}: {
  recipientId: string;
  onThreadCreated: (thread: IThreadSummary) => void;
  onBack?: () => void;
}) {
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhoto, setRecipientPhoto] = useState('');
  const [text, setText] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useSendMessage();
  const { data: threads = [] } = useThreads();

  // Fetch recipient profile for display
  useEffect(() => {
    profileApi.getProfile(recipientId).then((u) => {
      setRecipientName(u.fullName ?? `${u.firstName} ${u.lastName}`);
      setRecipientPhoto((u as any).profilePhoto ?? '');
    }).catch(() => setRecipientName('User'));
  }, [recipientId]);

  // After send, the thread list refreshes — find the new thread and select it
  useEffect(() => {
    if (!sendMessage.isSuccess) return;
    const thread = threads.find((t) => t.participant._id === recipientId);
    if (thread) onThreadCreated(thread);
  }, [threads, sendMessage.isSuccess]); // eslint-disable-line

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sendMessage.isPending) return;
    setText('');
    await sendMessage.mutateAsync({ recipientId, content: trimmed });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  };

  const initials = recipientName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shrink-0">
        {onBack && (
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 md:hidden">
            <ArrowLeft size={18} className="text-gray-500" />
          </button>
        )}
        {recipientPhoto
          ? <img src={recipientPhoto} alt={recipientName} className="w-9 h-9 rounded-full object-cover" />
          : <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center font-bold text-brand text-sm">{initials || '?'}</div>
        }
        <div>
          <p className="text-sm font-semibold text-gray-900">{recipientName || <span className="text-gray-300">Loading…</span>}</p>
          <p className="text-xs text-gray-400">New conversation</p>
        </div>
      </div>

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-300 p-8">
        <MessageSquareDashed size={48} className="opacity-30" />
        <p className="text-sm text-gray-400 font-medium">Start a conversation</p>
        <p className="text-xs text-gray-300 text-center">
          Say hello to {recipientName || 'this person'} — your first message will appear here.
        </p>
      </div>

      {/* Compose input */}
      <div className="border-t border-gray-100 p-3 bg-white shrink-0">
        <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-shadow px-3 py-2">
          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${recipientName || ''}…`}
            rows={1}
            disabled={sendMessage.isPending}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 resize-none outline-none max-h-32 leading-relaxed py-1"
            style={{ minHeight: '24px' }}
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sendMessage.isPending}
            className={`shrink-0 p-2 rounded-xl transition-all mb-0.5
              ${text.trim() && !sendMessage.isPending
                ? 'bg-brand text-white hover:bg-brand-dark'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
            aria-label="Send message"
          >
            {sendMessage.isPending
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1 ml-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function MessagingPage() {
  useSEO({ title: 'Messages', description: 'Your SkillSeal messages.', canonical: '/messages' });
  useSocketEvents();

  const [params, setParams]         = useSearchParams();
  const [activeThread, setActive]   = useState<IThreadSummary | null>(null);
  const [activeTab, setActiveTab]   = useState<Tab>('messages');
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list');
  // When ?userId= is present and no existing thread found yet
  const [newConvUserId, setNewConvUserId] = useState<string | null>(null);

  const [composeOpen, setComposeOpen] = useState(false);

  const { data: reqCountData } = useMessageRequestCount();
  const requestCount = reqCountData?.count ?? 0;
  const { data: threads = [], isSuccess: threadsLoaded } = useThreads();

  const userIdParam  = params.get('userId');
  const threadParam  = params.get('thread');

  // ── Handle ?userId= param from profile "Message" button ───────────────────
  useEffect(() => {
    if (!userIdParam || !threadsLoaded) return;

    // Check if a thread already exists with this user
    const existing = threads.find((t) => t.participant._id === userIdParam);
    if (existing) {
      // Thread exists — just open it
      selectThread(existing);
    } else {
      // No thread yet — show new-conversation compose panel
      setNewConvUserId(userIdParam);
      setMobileView('thread');
    }
    // Clear the userId param from URL now that we've handled it
    setParams(threadParam ? { thread: threadParam } : {}, { replace: true });
  }, [userIdParam, threadsLoaded]); // eslint-disable-line

  // ── Handle ?thread= param ─────────────────────────────────────────────────
  useEffect(() => {
    if (!threadParam || !threadsLoaded || activeThread) return;
    const match = threads.find((t) => t.threadId === threadParam);
    if (match) selectThread(match);
  }, [threadParam, threadsLoaded]); // eslint-disable-line

  const selectThread = (thread: IThreadSummary) => {
    setActive(thread);
    setNewConvUserId(null);
    setMobileView('thread');
    setParams({ thread: thread.threadId }, { replace: true });
  };

  const goBack = () => {
    setMobileView('list');
    setActive(null);
    setNewConvUserId(null);
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
                    onCompose={() => setComposeOpen(true)}
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

        {/* ── Right panel ─────────────────────────────────────────────────── */}
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
                <MessageThread thread={activeThread} onBack={goBack} />
              </motion.div>
            ) : newConvUserId ? (
              <motion.div
                key={`new-${newConvUserId}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col"
              >
                <NewConversationPanel
                  recipientId={newConvUserId}
                  onThreadCreated={selectThread}
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

      {/* ── New message modal ───────────────────────────────────────────── */}
      <NewMessageModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSelect={(userId) => {
          setComposeOpen(false);
          const existing = threads.find((t) => t.participant._id === userId);
          if (existing) {
            selectThread(existing);
          } else {
            setNewConvUserId(userId);
            setMobileView('thread');
          }
        }}
      />
    </div>
  );
}
