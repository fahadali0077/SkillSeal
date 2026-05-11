// ─────────────────────────────────────────────────────────────────────────────
// FeedPage.tsx  –  main activity feed with infinite scroll
// ─────────────────────────────────────────────────────────────────────────────
import { useSEO } from '../../lib/useSEO';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenLine, Loader2, RefreshCw, Rss } from 'lucide-react';
import { useInfiniteFeed } from './useFeed';
import PostCard from './PostCard';
import CreatePostModal from './CreatePostModal';
import TrendingHashtags from './TrendingHashtags';
import PeopleYouMayKnow from '../connections/PeopleYouMayKnow';
import { useAuthStore } from '../auth/useAuth';

export default function FeedPage() {
  useSEO({ title: 'Feed', description: 'Your personalized SkillSeal activity feed.', canonical: '/feed' });
  const [createOpen, setCreateOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const loaderRef = useRef<HTMLDivElement>(null);

  const {
    data, isLoading, isError, fetchNextPage,
    hasNextPage, isFetchingNextPage, refetch,
  } = useInfiniteFeed();

  const allPosts = data?.pages.flatMap((p) => p.posts) ?? [];

  // Intersection Observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Main feed column ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Create post prompt */}
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center font-bold text-brand shrink-0">
              {user?.firstName?.[0] ?? 'U'}
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex-1 text-left border border-gray-200 rounded-full px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              Share an update, achievement or insight…
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="btn-primary flex items-center gap-1.5 text-sm shrink-0"
            >
              <PenLine size={14} /> Post
            </button>
          </div>

          {/* Feed states */}
          {isLoading && (
            <div className="flex justify-center py-16 text-gray-300">
              <Loader2 size={32} className="animate-spin" />
            </div>
          )}

          {isError && (
            <div className="card p-8 text-center text-gray-400">
              <p className="mb-3">Could not load your feed.</p>
              <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2 mx-auto text-sm">
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {!isLoading && allPosts.length === 0 && (
            <div className="card p-10 text-center text-gray-400">
              <Rss size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-600 mb-1">Your feed is empty</p>
              <p className="text-sm">Connect with people and follow topics to see posts here.</p>
            </div>
          )}

          {/* Post list with animation */}
          <AnimatePresence initial={false}>
            {allPosts.map((post, i) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4), type: 'spring', damping: 24, stiffness: 280 }}
              >
                <PostCard post={post} />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Infinite scroll sentinel */}
          <div ref={loaderRef} className="flex justify-center py-6">
            {isFetchingNextPage && (
              <Loader2 size={24} className="animate-spin text-gray-300" />
            )}
            {!hasNextPage && allPosts.length > 0 && (
              <p className="text-xs text-gray-300">You're all caught up ✓</p>
            )}
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <TrendingHashtags />
          <PeopleYouMayKnow />
        </div>
      </div>

      {/* Create post modal */}
      {createOpen && <CreatePostModal onClose={() => setCreateOpen(false)} />}
    </>
  );
}
