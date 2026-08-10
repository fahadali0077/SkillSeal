// ─────────────────────────────────────────────────────────────────────────────
// MessageBubble.tsx
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCheck, Trash2, Smile } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { IMessageOut } from './messagingApi';
import { useDeleteMessage } from './useMessaging';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

interface Props {
  message:  IMessageOut;
  isOwn:    boolean;
  threadId: string;
}

export default function MessageBubble({ message, isOwn, threadId }: Props) {
  const [hovering, setHovering]       = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const deleteMsg = useDeleteMessage(threadId);

  const isDeleted = message.isDeleted;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 24, stiffness: 300 }}
      className={`flex items-end gap-2 mb-1 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setReactionOpen(false); }}
    >
      {/* Bubble */}
      <div className={`relative max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
            ${isOwn
              ? 'bg-brand text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'}
            ${isDeleted ? 'italic opacity-60' : ''}`}
        >
          {isDeleted ? (
            <span className="text-xs opacity-70">[Message deleted]</span>
          ) : (
            <>
              {message.content}
              {message.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block text-xs underline ${isOwn ? 'text-white/80' : 'text-brand'}`}
                    >
                      📎 {att.name}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Reactions on bubble */}
        {message.reactions.length > 0 && (
          <div className={`flex gap-0.5 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {message.reactions.map((r, i) => (
              <span key={i} className="text-sm bg-white border border-gray-200 rounded-full px-1.5 py-0.5 shadow-sm">
                {r.emoji}
              </span>
            ))}
          </div>
        )}

        {/* Timestamp + read receipt */}
        <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
          {isOwn && !isDeleted && (
            message.readAt
              ? <CheckCheck size={12} className="text-brand" />
              : <Check size={12} className="text-gray-400" />
          )}
        </div>
      </div>

      {/* Hover actions */}
      <AnimatePresence>
        {hovering && !isDeleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.1 }}
            className="flex items-center gap-1"
          >
            {/* Reaction picker trigger */}
            <div className="relative">
              <button
                onClick={() => setReactionOpen((o) => !o)}
                className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600"
              >
                <Smile size={15} />
              </button>

              <AnimatePresence>
                {reactionOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.9 }}
                    className={`absolute bottom-full mb-2 bg-white border border-gray-200 rounded-2xl shadow-xl
                      px-2 py-1.5 flex gap-1 z-30
                      ${isOwn ? 'right-0' : 'left-0'}`}
                  >
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setReactionOpen(false)}
                        className="text-xl transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Delete (own messages only) */}
            {isOwn && (
              <button
                onClick={() => deleteMsg.mutate(message._id)}
                disabled={deleteMsg.isPending}
                className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500"
              >
                <Trash2 size={13} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
