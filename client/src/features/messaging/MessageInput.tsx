// ─────────────────────────────────────────────────────────────────────────────
// MessageInput.tsx  –  text input with send + file attachment + typing events
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, type KeyboardEvent } from 'react';
import { Send, Paperclip, Loader2, X, FileText, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { emitTypingStart, emitTypingStop, useSendMessage } from './useMessaging';
import { messagingApi } from './messagingApi';

interface PendingFile {
  file:     File;
  preview?: string;   // object URL for images
  loading:  boolean;
  uploaded?: { url: string; type: string; name: string; sizeBytes: number };
}

interface Props {
  threadId:    string;
  recipientId: string;
  disabled?:   boolean;
}

export default function MessageInput({ threadId, recipientId, disabled }: Props) {
  const [text, setText]           = useState('');
  const [pending, setPending]     = useState<PendingFile[]>([]);
  const fileRef                   = useRef<HTMLInputElement>(null);
  const sendMessage               = useSendMessage();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    emitTypingStart(recipientId, threadId);
  };

  // ── File selection ─────────────────────────────────────────────────────────
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newEntries: PendingFile[] = Array.from(files).map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      loading: true,
    }));

    setPending((prev) => [...prev, ...newEntries]);

    // Upload each file concurrently
    await Promise.all(
      newEntries.map(async (entry, relIdx) => {
        try {
          const uploaded = await messagingApi.uploadAttachment(entry.file);
          setPending((prev) => {
            const copy = [...prev];
            // Find this entry by its object reference position
            const absIdx = copy.findIndex(
              (p) => p.file === entry.file && p.loading,
            );
            if (absIdx !== -1) copy[absIdx] = { ...copy[absIdx], loading: false, uploaded };
            return copy;
          });
        } catch {
          toast.error(`Failed to upload ${entry.file.name}`);
          setPending((prev) => prev.filter((p) => p.file !== entry.file));
        }
      }),
    );

    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeFile = (file: File) => {
    setPending((prev) => {
      const entry = prev.find((p) => p.file === file);
      if (entry?.preview) URL.revokeObjectURL(entry.preview);
      return prev.filter((p) => p.file !== file);
    });
  };

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = text.trim();
    const hasAttachments = pending.some((p) => p.uploaded);
    if ((!trimmed && !hasAttachments) || sendMessage.isPending) return;

    // Block if any file is still uploading
    if (pending.some((p) => p.loading)) {
      toast.error('Please wait for files to finish uploading.');
      return;
    }

    const attachments = pending.filter((p) => p.uploaded).map((p) => p.uploaded!);

    emitTypingStop(recipientId, threadId);
    setText('');
    setPending([]);
    try {
      await sendMessage.mutateAsync({ recipientId, content: trimmed, attachments: attachments.length ? attachments : undefined });
    } catch {
      setText(trimmed);
      setPending(attachments.map((u) => ({ file: new File([], u.name), uploaded: u, loading: false })));
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const isUploading = pending.some((p) => p.loading);

  return (
    <div className="border-t border-gray-100 p-3 bg-white">
      {/* ── File previews ───────────────────────────────────────────────── */}
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pending.map((entry) => (
            <div
              key={entry.file.name + entry.file.size}
              className="relative flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 max-w-[180px]"
            >
              {/* Thumbnail or file icon */}
              {entry.preview
                ? <img src={entry.preview} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                : <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-brand" />
                  </div>
              }
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-700 truncate">{entry.file.name}</p>
                <p className="text-[10px] text-gray-400">
                  {entry.loading ? 'Uploading…' : `${(entry.file.size / 1024).toFixed(0)} KB`}
                </p>
              </div>
              {entry.loading
                ? <Loader2 size={13} className="animate-spin text-brand shrink-0" />
                : (
                  <button
                    onClick={() => removeFile(entry.file)}
                    className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={13} />
                  </button>
                )
              }
            </div>
          ))}
        </div>
      )}

      {/* ── Input row ───────────────────────────────────────────────────── */}
      <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-shadow px-3 py-2">
        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || isUploading}
          title="Attach file (JPEG, PNG, WebP, PDF — max 10 MB)"
          className={`p-1.5 shrink-0 mb-0.5 transition-colors ${isUploading ? 'text-brand animate-pulse' : 'text-gray-400 hover:text-brand'}`}
          aria-label="Attach file"
        >
          <Paperclip size={17} />
        </button>

        {/* Hidden file input — accepts same types as server allows */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />

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
          disabled={(!text.trim() && !pending.some((p) => p.uploaded)) || sendMessage.isPending || isUploading || disabled}
          className={`shrink-0 p-2 rounded-xl transition-all mb-0.5
            ${(text.trim() || pending.some((p) => p.uploaded)) && !sendMessage.isPending && !isUploading
              ? 'bg-brand text-white hover:bg-brand-dark'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
          aria-label="Send message"
        >
          {sendMessage.isPending
            ? <Loader2 size={16} className="animate-spin" />
            : <Send size={16} />}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1 ml-2">Enter to send · Shift+Enter for new line · Attach: JPEG, PNG, PDF</p>
    </div>
  );
}
