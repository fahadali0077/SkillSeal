// ─────────────────────────────────────────────────────────────────────────────
// PostCard.tsx  –  renders any post type with full interaction controls
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Repeat2, MoreHorizontal, Trash2, Hash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { IPostCard, ReactionType } from '@SkillSeal/shared';
import ReactionPicker, { REACTIONS } from './ReactionPicker';
import PollCard from './PollCard';
import CertificateAnnouncement from './CertificateAnnouncement';
import CommentSection from './CommentSection';
import { useReact, useUnreact, useDeletePost, useRepost } from './useFeed';
import { useAuthStore } from '../auth/useAuth';

function Avatar({ src, name }: { src: string; name: string }) {
  return src
    ? <img src={src} alt={name} className="w-10 h-10 rounded-full object-cover" />
    : <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center font-bold text-brand">{name[0]}</div>;
}

function ReactionSummaryBar({ breakdown, total }: { breakdown: Record<string, number>; total: number }) {
  if (total === 0) return null;
  const top3 = Object.entries(breakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  return (
    <div className="flex items-center gap-1 text-xs text-gray-400">
      <span className="flex">
        {top3.map(([type]) => {
          const r = REACTIONS.find((x) => x.type === type);
          return r ? <span key={type} className="-ml-0.5 first:ml-0">{r.emoji}</span> : null;
        })}
      </span>
      <span>{total}</span>
    </div>
  );
}

interface Props {
  post: IPostCard;
  animate?: boolean;
}

export default function PostCard({ post, animate = true }: Props) {
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reposting, setReposting] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isOwner = user?._id === post.author._id;

  const react = useReact(post._id);
  const unreact = useUnreact(post._id);
  const deletePost = useDeletePost();
  const repost = useRepost();

  const handleReact = (r: ReactionType) => react.mutate(r);
  const handleUnreact = () => unreact.mutate();
  const handleRepost = async () => {
    if (reposting) return;
    setReposting(true);
    await repost.mutateAsync({ postId: post._id });
    setReposting(false);
  };

  const wrapper = animate
    ? { as: motion.article, initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring', damping: 24, stiffness: 260 } }
    : { as: 'article' as const };

  const Wrapper = animate ? motion.article : 'article';
  const motionProps = animate ? { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring' as const, damping: 24, stiffness: 260 } } : {};

  return (
    <Wrapper {...(motionProps as object)} className="card p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${post.author.customUrl || post.author._id}`}>
            <Avatar src={post.author.profilePhoto} name={post.author.fullName} />
          </Link>
          <div>
            <Link
              to={`/profile/${post.author.customUrl || post.author._id}`}
              className="font-semibold text-sm text-gray-900 hover:text-brand transition-colors"
            >
              {post.author.fullName}
            </Link>
            {post.author.headline && (
              <p className="text-xs text-gray-500 truncate max-w-[260px]">{post.author.headline}</p>
            )}
            <p className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[140px] py-1"
            >
              {isOwner && (
                <button
                  onClick={() => { deletePost.mutate(post._id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap mb-1">
        {post.content}
      </div>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 my-2">
          {post.tags.map((tag) => (
            <Link
              key={tag}
              to={`/hashtag/${tag}`}
              className="inline-flex items-center gap-0.5 text-xs text-brand hover:text-brand-dark font-medium"
            >
              <Hash size={11} />{tag}
            </Link>
          ))}
        </div>
      )}

      {/* Images */}
      {post.imageUrls.length > 0 && (
        <div className={`grid gap-1 mt-2 rounded-xl overflow-hidden
          ${post.imageUrls.length === 1 ? 'grid-cols-1' : post.imageUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {post.imageUrls.slice(0, 4).map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className={`w-full object-cover ${post.imageUrls.length === 1 ? 'max-h-96' : 'h-48'}`}
            />
          ))}
        </div>
      )}

      {/* Link preview */}
      {post.linkPreview && (
        <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden flex">
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
      {post.hasPoll && (
        <PollCard postId={post._id} options={[]} expiresAt={null} />
      )}

      {/* Certificate announcement */}
      {post.isVerificationAnnouncement && post.verificationBadge && (
        <CertificateAnnouncement badge={post.verificationBadge} authorName={post.author.fullName} />
      )}

      {/* Reaction summary */}
      {(post.reactionSummary?.total ?? 0) > 0 && (
        <div className="mt-3 mb-2">
          <ReactionSummaryBar
            breakdown={post.reactionSummary?.breakdown as Record<string, number> ?? {}}
            total={post.reactionSummary?.total ?? 0}
          />
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-1 pt-2 border-t border-gray-50 -mx-1">
        <ReactionPicker
          userReaction={post.reactionSummary?.userReaction ?? null}
          onReact={handleReact}
          onUnreact={handleUnreact}
        />

        <button
          onClick={() => setShowComments((o) => !o)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <MessageCircle size={15} />
          <span>{post.commentCount > 0 ? post.commentCount : ''} Comment</span>
        </button>

        <button
          onClick={handleRepost}
          disabled={reposting}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
        >
          <Repeat2 size={15} />
          <span>{post.repostCount > 0 ? post.repostCount : ''} Repost</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <CommentSection postId={post._id} comments={[]} total={post.commentCount} />
      )}
    </Wrapper>
  );
}
