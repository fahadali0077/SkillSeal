// ─────────────────────────────────────────────────────────────────────────────
// CreatePostModal.tsx  –  tabbed post creation modal
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Link2, FileText, BarChart2, AlignLeft, Plus, Trash2, Loader2, Upload } from 'lucide-react';
import { useCreatePost } from './useFeed';
import { useAuthStore } from '../auth/useAuth';
import ArticleEditor from './ArticleEditor';
import { feedApi } from './feedApi';
import type { PostType } from '@SkillSeal/shared';

type Tab = 'text' | 'image' | 'link' | 'article' | 'poll';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'text', label: 'Post', icon: <AlignLeft size={15} /> },
  { id: 'image', label: 'Image', icon: <ImageIcon size={15} /> },
  { id: 'link', label: 'Link', icon: <Link2 size={15} /> },
  { id: 'article', label: 'Article', icon: <FileText size={15} /> },
  { id: 'poll', label: 'Poll', icon: <BarChart2 size={15} /> },
];

const MAX: Record<Tab, number> = {
  text: 3000, image: 3000, link: 3000, article: 125000, poll: 140,
};

interface Props { onClose: () => void; }

export default function CreatePostModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('text');
  const [content, setContent] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkPreview, setLinkPreview] = useState<{ title: string; description: string; imageUrl: string; siteName: string } | null>(null);
  const [scrapingLink, setScrapingLink] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollDuration, setPollDuration] = useState(7);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createPost = useCreatePost();
  const user = useAuthStore((s) => s.user);

  const addImageUrl = () => imageUrls.length < 4 && setImageUrls((u) => [...u, '']);
  const updateImageUrl = (i: number, v: string) => setImageUrls((u) => u.map((x, idx) => idx === i ? v : x));
  const removeImageUrl = (i: number) => setImageUrls((u) => u.filter((_, idx) => idx !== i));

  // BROKEN-03: real file picker that uploads to Cloudinary via the existing
  // server upload endpoint, instead of the previous manual URL paste.
  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('File too large (max 10 MB).'); return; }
    const idx = imageUrls.length;
    setUploadingIdx(idx);
    setImageUrls((u) => [...u, '']);
    try {
      const { url } = await feedApi.uploadImage(file);
      setImageUrls((u) => u.map((x, i) => i === idx ? url : x));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setImageUrls((u) => u.filter((_, i) => i !== idx));
    } finally {
      setUploadingIdx(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // HIGH-04: when the user pastes/blurs the link URL, fetch OG tags.
  const handleLinkBlur = async () => {
    const trimmed = linkUrl.trim();
    if (!trimmed) { setLinkPreview(null); return; }
    setScrapingLink(true);
    try {
      const preview = await feedApi.scrapeLink(trimmed);
      setLinkPreview(preview);
    } catch {
      // Non-fatal: post still creates with bare URL.
      setLinkPreview(null);
    } finally {
      setScrapingLink(false);
    }
  };

  const addPollOption = () => pollOptions.length < 4 && setPollOptions((o) => [...o, '']);
  const updatePollOption = (i: number, v: string) => setPollOptions((o) => o.map((x, idx) => idx === i ? v : x));
  const removePollOption = (i: number) => pollOptions.length > 2 && setPollOptions((o) => o.filter((_, idx) => idx !== i));

  const canSubmit = (() => {
    if (!content.trim() && tab !== 'image' && tab !== 'poll') return false;
    if (tab === 'image' && imageUrls.filter(Boolean).length === 0) return false;
    if (tab === 'poll' && pollOptions.filter(Boolean).length < 2) return false;
    if (content.length > MAX[tab]) return false;
    return true;
  })();

  const handleSubmit = async () => {
    setError(null);
    try {
      await createPost.mutateAsync({
        type: tab as PostType,
        content: content.trim(),
        imageUrls: tab === 'image' ? imageUrls.filter(Boolean) : undefined,
        linkUrl: tab === 'link' ? linkUrl : undefined,
        linkPreview: tab === 'link' && linkPreview ? linkPreview : undefined,
        pollOptions: tab === 'poll' ? pollOptions.filter(Boolean) : undefined,
        pollDuration: tab === 'poll' ? pollDuration : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
          initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          exit={{ y: 32, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              {user && (
                <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center font-bold text-brand text-sm">
                  {user.firstName?.[0]}
                </div>
              )}
              <div>
                <p className="font-semibold text-sm text-gray-900">{user?.firstName} {(user as unknown as { lastName?: string })?.lastName}</p>
                <p className="text-xs text-gray-400">Sharing with connections</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex px-5 pt-3 gap-1 shrink-0">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors
                  ${tab === t.id ? 'bg-brand text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* Body (scrollable) */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            {/* Main content input */}
            {tab !== 'article' ? (
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    tab === 'poll'
                      ? 'Ask a question… (optional)'
                      : tab === 'link'
                        ? 'Add commentary…'
                        : "What's on your mind?"
                  }
                  rows={tab === 'text' ? 5 : 3}
                  className="w-full resize-none text-sm text-gray-800 outline-none placeholder:text-gray-400 leading-relaxed"
                  maxLength={MAX[tab]}
                />
                <span className={`absolute bottom-0 right-0 text-xs ${content.length > MAX[tab] * 0.9 ? 'text-amber-500' : 'text-gray-300'}`}>
                  {content.length}/{MAX[tab]}
                </span>
              </div>
            ) : (
              <ArticleEditor value={content} onChange={setContent} maxLen={125000} />
            )}

            {/* Image URLs */}
            {tab === 'image' && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Images (up to 4)</p>
                {imageUrls.map((url, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    {url ? (
                      <img src={url} alt="" className="w-14 h-14 rounded-md object-cover border" />
                    ) : (
                      <div className="w-14 h-14 rounded-md bg-gray-100 flex items-center justify-center text-gray-300">
                        {uploadingIdx === i ? <Loader2 className="animate-spin" size={18} /> : <ImageIcon size={18} />}
                      </div>
                    )}
                    <input
                      value={url}
                      onChange={(e) => updateImageUrl(i, e.target.value)}
                      placeholder="https://… (or use Upload)"
                      className="input flex-1 text-sm"
                    />
                    <button onClick={() => removeImageUrl(i)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-3">
                  {imageUrls.length < 4 && (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingIdx !== null}
                        className="text-xs text-brand flex items-center gap-1 disabled:opacity-50"
                      >
                        <Upload size={12} /> Upload from device
                      </button>
                      <button onClick={addImageUrl} className="text-xs text-gray-500 flex items-center gap-1">
                        <Plus size={12} /> Add URL
                      </button>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFilePick}
                />
              </div>
            )}

            {/* Link URL */}
            {tab === 'link' && (
              <div className="space-y-2">
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onBlur={handleLinkBlur}
                  placeholder="https://…"
                  className="input text-sm"
                />
                {scrapingLink && (
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <Loader2 size={11} className="animate-spin" /> Fetching link preview…
                  </p>
                )}
                {linkPreview && (linkPreview.title || linkPreview.imageUrl) && (
                  <div className="border rounded-lg overflow-hidden">
                    {linkPreview.imageUrl && (
                      <img src={linkPreview.imageUrl} alt="" className="w-full h-32 object-cover" />
                    )}
                    <div className="p-3">
                      <p className="text-xs text-gray-400">{linkPreview.siteName}</p>
                      <p className="text-sm font-semibold text-gray-800 line-clamp-1">{linkPreview.title}</p>
                      {linkPreview.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{linkPreview.description}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Poll options */}
            {tab === 'poll' && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Poll options</p>
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      value={opt}
                      onChange={(e) => updatePollOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="input flex-1 text-sm"
                    />
                    {pollOptions.length > 2 && (
                      <button onClick={() => removePollOption(i)} className="text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 4 && (
                  <button onClick={addPollOption} className="text-xs text-brand flex items-center gap-1">
                    <Plus size={12} /> Add option
                  </button>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <label className="text-xs text-gray-500">Duration:</label>
                  {[1, 3, 7, 14].map((d) => (
                    <button
                      key={d}
                      onClick={() => setPollDuration(d)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors
                        ${pollDuration === d ? 'border-brand text-brand bg-blue-50' : 'border-gray-200 text-gray-500'}`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t flex justify-end gap-3 shrink-0">
            <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || createPost.isPending}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {createPost.isPending && <Loader2 size={14} className="animate-spin" />}
              {createPost.isPending ? 'Posting…' : 'Post'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
