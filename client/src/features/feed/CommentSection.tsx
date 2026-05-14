// ─────────────────────────────────────────────────────────────────────────────
// CommentSection.tsx  –  threaded comments, 3-level depth
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useAddComment, useComments } from './useFeed';
import { useAuthStore } from '../auth/useAuth';
import type { CommentOut } from './feedApi';

function Avatar({ src, name }: { src: string; name: string }) {
  return src
    ? <img src={src} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />
    : <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold shrink-0">{name[0]}</div>;
}

interface CommentItemProps {
  comment:  CommentOut;
  postId:   string;
  depth:    number;
  replies?: CommentOut[];
}

function CommentItem({ comment, postId, depth, replies = [] }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyOpen, setReplyOpen]     = useState(false);
  const [replyText, setReplyText]     = useState('');
  const addComment = useAddComment(postId);

  const submitReply = async () => {
    if (!replyText.trim()) return;
    await addComment.mutateAsync({ content: replyText, parentCommentId: comment._id });
    setReplyText('');
    setReplyOpen(false);
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className="flex gap-2.5 py-2">
        <Avatar src={comment.author.profilePhoto} name={comment.author.fullName} />
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-2xl px-3.5 py-2.5">
            <p className="font-semibold text-xs text-gray-900">{comment.author.fullName}</p>
            <p className="text-sm text-gray-800 mt-0.5 leading-snug">{comment.content}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 ml-2">
            <span className="text-xs text-gray-400">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
            {depth < 3 && (
              <button
                onClick={() => setReplyOpen((o) => !o)}
                className="text-xs text-gray-500 hover:text-brand font-medium"
              >
                Reply
              </button>
            )}
          </div>

          {/* Reply input */}
          <AnimatePresence>
            {replyOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 flex gap-2 items-center"
              >
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply…"
                  className="input flex-1 text-sm py-1.5"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submitReply()}
                  autoFocus
                />
                <button
                  onClick={submitReply}
                  disabled={addComment.isPending || !replyText.trim()}
                  className="btn-primary p-2"
                >
                  {addComment.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nested replies */}
      {replies.length > 0 && (
        <div className="ml-8">
          <button
            onClick={() => setShowReplies((o) => !o)}
            className="text-xs text-brand hover:text-brand-dark flex items-center gap-1 mb-1"
          >
            {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showReplies ? 'Hide' : 'Show'} {replies.length} repl{replies.length > 1 ? 'ies' : 'y'}
          </button>
          <AnimatePresence>
            {showReplies && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {replies.map((r) => (
                  <CommentItem key={r._id} comment={r} postId={postId} depth={depth + 1} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

interface Props {
  postId: string;
  total:  number;
}

export default function CommentSection({ postId, total }: Props) {
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const addComment = useAddComment(postId);
  const user = useAuthStore((s) => s.user);

  // Fetch comments from server
  const { data: comments = [], isLoading } = useComments(postId);

  const topLevel = comments.filter((c) => !c.parentCommentId);
  const replies  = comments.filter((c) => !!c.parentCommentId);
  const getReplies = (id: string) => replies.filter((r) => r.parentCommentId === id);

  const visible = expanded ? topLevel : topLevel.slice(0, 2);

  const submit = async () => {
    if (!text.trim()) return;
    await addComment.mutateAsync({ content: text });
    setText('');
  };

  return (
    <div className="pt-3 border-t border-gray-50">
      {/* Comment input */}
      {user && (
        <div className="flex gap-2 items-center mb-3">
          <Avatar src={(user as { profilePhoto?: string }).profilePhoto ?? ''} name={user.firstName ?? 'U'} />
          <div className="flex-1 flex gap-2 items-center">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a comment…"
              className="input flex-1 text-sm py-1.5"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submit()}
            />
            <button
              onClick={submit}
              disabled={addComment.isPending || !text.trim()}
              className="btn-primary p-2"
            >
              {addComment.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 size={18} className="animate-spin text-gray-300" />
        </div>
      )}

      {/* Comments list */}
      <AnimatePresence initial={false}>
        {visible.map((c) => (
          <motion.div
            key={c._id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <CommentItem
              comment={c}
              postId={postId}
              depth={0}
              replies={getReplies(c._id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {topLevel.length > 2 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-brand hover:text-brand-dark flex items-center gap-1 mt-1 ml-10"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Show less' : `View all ${total} comments`}
        </button>
      )}
    </div>
  );
}
