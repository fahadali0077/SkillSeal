import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, UserCheck, Clock, UserMinus,
  Loader2, ChevronDown, Bell, BellOff,
} from 'lucide-react';
import type { ConnectionStatus } from '@SkillSeal/shared';
import {
  useSendRequest, useRemoveConnection, useAcceptRequest,
  useDeclineRequest, useFollowUser, useUnfollowUser,
} from './useConnections';

interface Props {
  targetUserId:     string;
  connectionStatus: ConnectionStatus;
  connectionId?:    string;      // Connection doc _id — used for accept/decline
  isFollowing?:     boolean;
  compact?:         boolean;
  onStatusChange?:  (s: ConnectionStatus) => void;
}

export default function ConnectionButton({
  targetUserId,
  connectionStatus,
  connectionId,
  isFollowing = false,
  compact = false,
  onStatusChange,
}: Props) {
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [localStatus,   setLocalStatus]   = useState<ConnectionStatus>(connectionStatus);
  const [localFollowing, setLocalFollowing] = useState(isFollowing);

  // ── CRITICAL: keep localStatus in sync when the profile cache refetches.
  // useState initialises only once; without this effect the button stays
  // stale even after the profile query returns the updated connectionStatus.
  useEffect(() => {
    setLocalStatus(connectionStatus);
  }, [connectionStatus]);

  useEffect(() => {
    setLocalFollowing(isFollowing);
  }, [isFollowing]);

  const sendReq    = useSendRequest();
  const removeConn = useRemoveConnection();
  const accept     = useAcceptRequest();
  const decline    = useDeclineRequest();
  const follow     = useFollowUser();
  const unfollow   = useUnfollowUser();

  const isLoading = sendReq.isPending || removeConn.isPending ||
                    accept.isPending  || decline.isPending;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleConnect = async () => {
    try {
      await sendReq.mutateAsync({ recipientId: targetUserId });
      setLocalStatus('pending');
      onStatusChange?.('pending');
    } catch { /* query cache invalidation handles UI update */ }
  };

  // Withdraw an OUTGOING pending request — pass targetUserId (not connectionId)
  // because useRemoveConnection calls DELETE /connections/with/:userId
  const handleWithdraw = async () => {
    try {
      await removeConn.mutateAsync(targetUserId);
      setLocalStatus('none');
      onStatusChange?.('none');
      setMenuOpen(false);
    } catch { /* ignore */ }
  };

  // Remove an ACCEPTED connection — same: pass targetUserId
  const handleRemove = async () => {
    try {
      await removeConn.mutateAsync(targetUserId);
      setLocalStatus('none');
      onStatusChange?.('none');
      setMenuOpen(false);
    } catch { /* ignore */ }
  };

  // Accept / Decline use the Connection document _id (from /connections/pending)
  const handleAccept = async () => {
    if (!connectionId) return;
    try {
      await accept.mutateAsync(connectionId);
      setLocalStatus('accepted');
      onStatusChange?.('accepted');
    } catch { /* ignore */ }
  };

  const handleDecline = async () => {
    if (!connectionId) return;
    try {
      await decline.mutateAsync(connectionId);
      setLocalStatus('none');
      onStatusChange?.('none');
    } catch { /* ignore */ }
  };

  const handleFollow = async () => {
    try {
      if (localFollowing) {
        await unfollow.mutateAsync(targetUserId);
        setLocalFollowing(false);
      } else {
        await follow.mutateAsync(targetUserId);
        setLocalFollowing(true);
      }
    } catch { /* ignore */ }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // Incoming pending — show Accept / Decline
  if (localStatus === 'pending' && connectionId) {
    return (
      <div className="flex gap-2">
        <button onClick={handleAccept} disabled={isLoading}
          className="btn-primary flex items-center gap-1.5 text-sm">
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
          Accept
        </button>
        <button onClick={handleDecline} disabled={isLoading}
          className="btn-secondary flex items-center gap-1.5 text-sm">
          Decline
        </button>
      </div>
    );
  }

  // Outgoing pending — show Pending / Withdraw
  if (localStatus === 'pending') {
    return (
      <button onClick={handleWithdraw} disabled={isLoading}
        className="btn-secondary flex items-center gap-1.5 text-sm text-gray-500">
        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
        {!compact && 'Pending'}
      </button>
    );
  }

  // Connected — show dropdown with Follow / Remove
  if (localStatus === 'accepted') {
    return (
      <div className="relative">
        <button onClick={() => setMenuOpen(o => !o)}
          className="btn-secondary flex items-center gap-1.5 text-sm">
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
              <button onClick={handleFollow}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                {localFollowing ? <BellOff size={14} /> : <Bell size={14} />}
                {localFollowing ? 'Unfollow' : 'Follow'}
              </button>
              <button onClick={handleRemove} disabled={removeConn.isPending}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                {removeConn.isPending
                  ? <Loader2 size={14} className="animate-spin" />
                  : <UserMinus size={14} />}
                Remove connection
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // No relationship — Connect
  return (
    <button onClick={handleConnect} disabled={isLoading}
      className="btn-primary flex items-center gap-1.5 text-sm">
      {isLoading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
      {!compact && 'Connect'}
    </button>
  );
}
