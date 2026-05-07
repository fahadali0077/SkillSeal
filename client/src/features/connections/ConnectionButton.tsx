// ─────────────────────────────────────────────────────────────────────────────
// ConnectionButton.tsx
// Context-aware connection button: Connect / Pending / Connected / Follow.
// Reads the profile's connectionStatus and dispatches the correct action.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, UserCheck, Clock, UserMinus,
  Loader2, ChevronDown, UserX, Bell, BellOff,
} from 'lucide-react';
import type { ConnectionStatus } from '@SkillSeal/shared';
import {
  useSendRequest, useRemoveConnection, useAcceptRequest,
  useDeclineRequest, useFollowUser, useUnfollowUser,
} from './useConnections';

interface Props {
  targetUserId: string;
  connectionStatus: ConnectionStatus;
  connectionId?: string;      // set when status is 'pending' or 'accepted'
  isFollowing?: boolean;
  compact?: boolean;     // icon-only mode for small layouts
  onStatusChange?: (newStatus: ConnectionStatus) => void;
}

export default function ConnectionButton({
  targetUserId,
  connectionStatus,
  connectionId,
  isFollowing = false,
  compact = false,
  onStatusChange,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState<ConnectionStatus>(connectionStatus);
  const [localFollowing, setLocalFollowing] = useState(isFollowing);

  const sendReq = useSendRequest();
  const removeConn = useRemoveConnection();
  const accept = useAcceptRequest();
  const decline = useDeclineRequest();
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();

  const isLoading = sendReq.isPending || removeConn.isPending || accept.isPending || decline.isPending;

  const handleConnect = async () => {
    try {
      await sendReq.mutateAsync({ recipientId: targetUserId });
      setLocalStatus('pending');
      onStatusChange?.('pending');
    } catch { /* error handled by React Query */ }
  };

  const handleWithdraw = async () => {
    if (!connectionId) return;
    await removeConn.mutateAsync(connectionId);
    setLocalStatus('none');
    onStatusChange?.('none');
    setMenuOpen(false);
  };

  const handleRemove = async () => {
    if (!connectionId) return;
    await removeConn.mutateAsync(connectionId);
    setLocalStatus('none');
    onStatusChange?.('none');
    setMenuOpen(false);
  };

  const handleAccept = async () => {
    if (!connectionId) return;
    await accept.mutateAsync(connectionId);
    setLocalStatus('accepted');
    onStatusChange?.('accepted');
  };

  const handleDecline = async () => {
    if (!connectionId) return;
    await decline.mutateAsync(connectionId);
    setLocalStatus('none');
    onStatusChange?.('none');
  };

  const handleFollow = async () => {
    if (localFollowing) {
      await unfollow.mutateAsync(targetUserId);
      setLocalFollowing(false);
    } else {
      await follow.mutateAsync(targetUserId);
      setLocalFollowing(true);
    }
  };

  // ── Incoming pending (recipient view) ─────────────────────────────────────
  if (localStatus === 'pending' && connectionId) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          disabled={isLoading}
          className="btn-primary flex items-center gap-1.5 text-sm"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
          Accept
        </button>
        <button
          onClick={handleDecline}
          disabled={isLoading}
          className="btn-secondary flex items-center gap-1.5 text-sm"
        >
          Decline
        </button>
      </div>
    );
  }

  // ── Outgoing pending (requester view) ─────────────────────────────────────
  if (localStatus === 'pending') {
    return (
      <button
        onClick={handleWithdraw}
        disabled={isLoading}
        className="btn-secondary flex items-center gap-1.5 text-sm text-gray-500"
      >
        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
        {compact ? null : 'Pending'}
      </button>
    );
  }

  // ── Connected ─────────────────────────────────────────────────────────────
  if (localStatus === 'accepted') {
    return (
      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="btn-secondary flex items-center gap-1.5 text-sm"
        >
          <UserCheck size={14} className="text-brand" />
          {!compact && 'Connected'}
          <ChevronDown size={12} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[160px] py-1"
            >
              <button
                onClick={handleFollow}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {localFollowing ? <BellOff size={14} /> : <Bell size={14} />}
                {localFollowing ? 'Unfollow' : 'Follow'}
              </button>
              <button
                onClick={handleRemove}
                disabled={removeConn.isPending}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                {removeConn.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                Remove connection
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── No relationship — default Connect ─────────────────────────────────────
  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className="btn-primary flex items-center gap-1.5 text-sm"
    >
      {isLoading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
      {compact ? null : 'Connect'}
    </button>
  );
}
