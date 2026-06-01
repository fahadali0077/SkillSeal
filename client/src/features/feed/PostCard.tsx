import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Repeat2, MoreHorizontal, Trash2, Hash, Flag, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import type { IPostCard, ReactionType } from '@SkillSeal/shared';
import ReactionPicker, { REACTIONS } from './ReactionPicker';
import PollCard from './PollCard';
import CertificateAnnouncement from './CertificateAnnouncement';
import CommentSection from './CommentSection';
import { useReact, useUnreact, useDeletePost, useRepost, useVotePoll } from './useFeed';
import { useAuthStore } from '../auth/useAuth';

function Avatar({ src, name }: { src: string; name: string }) {
  return src
    ? <img src={src} alt={name} className="w-10 h-10 rounded-full object-cover" />
    : <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center font-bold text-brand">{name[0]}</div>;
}

interface Props {
  post:     IPostCard;
  animate?: boolean;
}

export default function PostCard({ post, animate = false }: Props) {
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [reposting, setReposting]       = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const user    = useAuthStore((s) => s.user);
  const isOwner = user?._id === post.author._id;

  const react      = useReact(post._id);
  const unreact    = useUnreact(post._id);
  const deletePost = useDeletePost();
  const doRepost   = useRepost();
  const votePoll   = useVotePoll(post._id);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleReact = (r: ReactionType) => {
    react.mutate(r, { onError: () => toast.error('Could not react. Try again.') });
  };
  const handleUnreact = () => {
    unreact.mutate(undefined, { onError: () => toast.error('Could not remove reaction.') });
  };
  const handleRepost = async () => {
    if (reposting) return;
    setReposting(true);
    try {
      await doRepost.mutateAsync({ postId: post._id });
      toast.success('Reposted!');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not repost.');
    } finally {
      setReposting(false);
    }
  };
  const handleDelete = () => {
    deletePost.mutate(post._id, {
      onSuccess: () => toast.success('Post deleted.'),
      onError:   () => toast.error('Could not delete post.'),
    });
    setMenuOpen(false);
  };

  // Reaction summary: top-3 emojis + total count
  const summary      = post.reactionSummary;
  const totalReacts  = summary?.total ?? 0;
  const breakdown    = (summary?.breakdown ?? {}) as Record<string, number>;
  const top3emojis   = Object.entries(breakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([type]) => REACTIONS.find((r) => r.type === type)?.emoji)
    .filter(Boolean);

  const Wrapper     = animate ? motion.article : 'article';
  const motionProps = animate
    ? { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring' as const, damping: 24, stiffness: 260 } }
    : {};

  return (
    <Wrapper {...(motionProps as object)} className="card p-0 overflow-hidden">
      <div className="px-5 pt-5">
        {/* ── Author row ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Link to={`/profile/${post.author.customUrl || post.author._id}`}>
              <Avatar src={post.author.profilePhoto} name={post.author.fullName} />
            </Link>
            <div>
              <Link
                to={`/profile/${post.author.customUrl || post.author._id}`}
                className="font-semibold text-sm text-gray-900 hover:text-brand transition-colors leading-tight block"
              >
                {post.author.fullName}
              </Link>
              {post.author.headline && (
                <p className="text-xs text-gray-500 truncate max-w-[280px] leading-tight">{post.author.headline}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* ··· menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 min-w-[160px] py-1"
              >
                {isOwner ? (
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} /> Delete post
                  </button>
                ) : (
                  <button
                    onClick={() => { toast('Post reported.'); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Flag size={14} /> Report post
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>

        {/* HIGH-22 / BROKEN-07: Read more link when content was truncated server-side */}
        {post.isTruncated && (
          <Link
            to={`/posts/${post._id}`}
            className="inline-block mt-1 text-xs text-brand hover:underline font-medium"
          >
            Read more →
          </Link>
        )}

        {/* HIGH-09: nested original post when this is a repost */}
        {post.isRepost && post.originalPost && (
          <div className="mt-3 border border-gray-200 rounded-xl p-3 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <Avatar src={post.originalPost.author.profilePhoto} name={post.originalPost.author.fullName} />
              <div className="min-w-0">
                <Link
                  to={`/u/${post.originalPost.author.customUrl || post.originalPost.author._id}`}
                  className="font-semibold text-sm text-gray-900 hover:underline truncate block"
                >
                  {post.originalPost.author.fullName}
                </Link>
                <p className="text-xs text-gray-400 truncate">{post.originalPost.author.headline}</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.originalPost.content}</p>
            {post.originalPost.isTruncated && (
              <Link
                to={`/posts/${post.originalPost._id}`}
                className="inline-block mt-1 text-xs text-brand hover:underline font-medium"
              >
                Read more →
              </Link>
            )}
            {post.originalPost.imageUrls?.length > 0 && (
              <img
                src={post.originalPost.imageUrls[0]}
                alt=""
                className="w-full max-h-64 object-cover rounded-lg mt-2"
              />
            )}
          </div>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {post.tags.map((tag) => (
              <Link key={tag} to={`/hashtag/${tag}`}
                className="inline-flex items-center gap-0.5 text-xs text-brand hover:underline font-medium">
                <Hash size={11} />{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Images */}
        {post.imageUrls.length > 0 && (
          <div className={`grid gap-0.5 mt-3 rounded-xl overflow-hidden
            ${post.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.imageUrls.slice(0, 4).map((url, i) => (
              <img key={i} src={url} alt=""
                className={`w-full object-cover ${post.imageUrls.length === 1 ? 'max-h-[500px]' : 'h-48'}`} />
            ))}
          </div>
        )}

        {/* Link preview */}
        {post.linkPreview && (
          <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden flex">
            {post.linkPreview.imageUrl && (
              <img src={post.linkPreview.imageUrl} alt="" className="w-24 h-20 object-cover shrink-0" />
            )}
            <div className="px-3 py-2 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">{post.linkPreview.title}</p>
              <p className="text-xs text-gray-400">{post.linkPreview.siteName}</p>
            </div>
          </div>
        )}

        {/* Poll */}
        {post.hasPoll && post.pollOptions && post.pollOptions.length > 0 && (
          <PollCard
            postId={post._id}
            options={post.pollOptions}
            expiresAt={post.pollExpiresAt ?? null}
            isVoting={votePoll.isPending}
            onVote={async (optionId) => { await votePoll.mutateAsync(optionId); }}
          />
        )}

        {/* Certificate */}
        {post.isVerificationAnnouncement && post.verificationBadge && (
          <CertificateAnnouncement badge={post.verificationBadge} authorName={post.author.fullName} />
        )}
      </div>

      {/* ── Reaction summary row (LinkedIn-style) ──────────────────── */}
      {(totalReacts > 0 || post.commentCount > 0 || post.repostCount > 0) && (
        <div className="flex items-center justify-between px-5 py-2 mt-2">
          {/* Left: reaction emojis + count */}
          {totalReacts > 0 ? (
            <div className="flex items-center gap-1 text-sm text-gray-500 hover:underline cursor-pointer">
              <span className="flex -space-x-0.5">
                {top3emojis.map((e, i) => (
                  <span key={i} className="text-base leading-none">{e}</span>
                ))}
              </span>
              <span className="text-xs ml-1">{totalReacts}</span>
            </div>
          ) : <div />}

          {/* Right: comment + repost counts */}
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {post.commentCount > 0 && (
              <button onClick={() => setShowComments((o) => !o)} className="hover:underline">
                {post.commentCount} comment{post.commentCount !== 1 ? 's' : ''}
              </button>
            )}
            {post.repostCount > 0 && (
              <span>{post.repostCount} repost{post.repostCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      )}

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 mx-2" />

      {/* ── Action bar (LinkedIn-style full-width buttons) ──────────── */}
      <div className="flex items-center px-2 py-1">
        {/* Like / React */}
        <ReactionPicker
          userReaction={summary?.userReaction ?? null}
          onReact={handleReact}
          onUnreact={handleUnreact}
        />

        {/* Comment */}
        <button
          onClick={() => setShowComments((o) => !o)}
          className="flex flex-1 items-center justify-center gap-2 text-sm font-medium text-gray-500
            hover:bg-gray-100 hover:text-gray-700 rounded-lg px-2 py-2.5 transition-colors"
        >
          <MessageCircle size={18} />
          <span>Comment</span>
        </button>

        {/* Repost */}
        <button
          onClick={handleRepost}
          disabled={reposting}
          className={`flex flex-1 items-center justify-center gap-2 text-sm font-medium rounded-lg px-2 py-2.5 transition-colors
            ${reposting
              ? 'text-green-600 bg-green-50 cursor-not-allowed'
              : 'text-gray-500 hover:bg-gray-100 hover:text-green-700'}`}
        >
          <Repeat2 size={18} />
          <span>Repost</span>
        </button>

        {/* Send / Share */}
        <button
          onClick={() => { navigator.clipboard?.writeText(window.location.origin + '/post/' + post._id); toast.success('Link copied!'); }}
          className="flex flex-1 items-center justify-center gap-2 text-sm font-medium text-gray-500
            hover:bg-gray-100 hover:text-gray-700 rounded-lg px-2 py-2.5 transition-colors"
        >
          <Send size={18} />
          <span>Send</span>
        </button>
      </div>

      {/* ── Comments ────────────────────────────────────────────────── */}
      {showComments && (
        <div className="px-5 pb-4 pt-2 border-t border-gray-100">
          <CommentSection postId={post._id} total={post.commentCount} />
        </div>
      )}
    </Wrapper>
  );
}
