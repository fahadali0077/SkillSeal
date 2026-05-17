// ─────────────────────────────────────────────────────────────────────────────
// FeedPage.tsx  –  main activity feed with infinite scroll
// ─────────────────────────────────────────────────────────────────────────────
import { useSEO } from '../../lib/useSEO';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenLine, Loader2, RefreshCw, Rss, Image, BarChart2, FileText, Sparkles } from 'lucide-react';
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

          {/* Composer card */}
          <div className="card p-4 sm:p-5">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand/15 to-brand/5 flex items-center justify-center font-bold text-brand shrink-0 ring-2 ring-brand/10">
                {(user as { profilePhoto?: string } | null)?.profilePhoto
                  ? <img src={(user as { profilePhoto?: string }).profilePhoto} alt="" className="w-full h-full object-cover rounded-full" />
                  : (user?.firstName?.[0] ?? 'U')}
              </div>

              {/* Compose prompt */}
              <button
                onClick={() => setCreateOpen(true)}
                className="flex-1 text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full px-4 py-2.5 text-sm text-gray-500 transition-colors"
              >
                What's on your mind, {user?.firstName ?? 'there'}?
              </button>
            </div>

            {/* Quick action shortcuts */}
            <div className="grid grid-cols-3 gap-1 mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Image size={15} className="text-blue-500" /> Photo
              </button>
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <BarChart2 size={15} className="text-amber-500" /> Poll
              </button>
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <FileText size={15} className="text-green-500" /> Article
              </button>
            </div>
          </div>

          {/* Feed states */}
          {isLoading && (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="skeleton w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-3 w-32 rounded" />
                      <div className="skeleton h-2.5 w-20 rounded" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="skeleton h-3 w-full rounded" />
                    <div className="skeleton h-3 w-5/6 rounded" />
                    <div className="skeleton h-3 w-3/4 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="card p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-red-50 flex items-center justify-center">
                <RefreshCw size={22} className="text-red-400" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">Couldn't load your feed</p>
              <p className="text-sm text-gray-400 mb-4">Check your connection and try again.</p>
              <button onClick={() => refetch()} className="btn-secondary text-sm mx-auto">
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {!isLoading && !isError && allPosts.length === 0 && (
            <div className="card p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand/15 to-brand/5 flex items-center justify-center">
                <Rss size={28} className="text-brand" />
              </div>
              <p className="font-bold text-gray-900 mb-1">Your feed is empty</p>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">Connect with people and follow topics to start seeing posts here.</p>
              <button onClick={() => setCreateOpen(true)} className="btn-primary text-sm mt-5 mx-auto">
                <PenLine size={14} /> Create your first post
              </button>
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
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <Loader2 size={14} className="animate-spin" />
                Loading more…
              </div>
            )}
            {!hasNextPage && allPosts.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
                <Sparkles size={11} className="text-amber-500" /> You're all caught up
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <TrendingHashtags />
          <PeopleYouMayKnow />
        </div>
      </div>

      {/* Create post modal */}
      {createOpen && <CreatePostModal onClose={() => setCreateOpen(false)} />}
    </>
  );
}
