// ─────────────────────────────────────────────────────────────────────────────
// MessageInput.tsx  –  text input with send + file attachment + typing events
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, type KeyboardEvent } from 'react';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import { emitTypingStart, emitTypingStop, useSendMessage } from './useMessaging';

interface Props {
  threadId:    string;
  recipientId: string;
  disabled?:   boolean;
}

export default function MessageInput({ threadId, recipientId, disabled }: Props) {
  const [text, setText]     = useState('');
  const fileRef             = useRef<HTMLInputElement>(null);
  const sendMessage         = useSendMessage();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    emitTypingStart(recipientId, threadId);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sendMessage.isPending) return;
    emitTypingStop(recipientId, threadId);
    setText('');
    try {
      await sendMessage.mutateAsync({ recipientId, content: trimmed });
    } catch (err) {
      // Restore text on failure
      setText(trimmed);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="border-t border-gray-100 p-3 bg-white">
      <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-shadow px-3 py-2">
        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="p-1.5 text-gray-400 hover:text-gray-600 shrink-0 mb-0.5"
          aria-label="Attach file"
        >
          <Paperclip size={17} />
        </button>
        <input ref={fileRef} type="file" className="hidden" multiple />

        {/* Text area */}
        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a message…"
          rows={1}
          disabled={disabled || sendMessage.isPending}
          className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 resize-none outline-none max-h-32 leading-relaxed py-1"
          style={{ minHeight: '24px' }}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || sendMessage.isPending || disabled}
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
  );
}
