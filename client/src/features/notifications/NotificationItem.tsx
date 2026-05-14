import { Link } from 'react-router-dom';
import {
  ShieldCheck, UserPlus, Heart, MessageSquare,
  Briefcase, Bell, AlertTriangle,
} from 'lucide-react';
import type { INotification } from './notificationsApi';
import { useMarkRead } from './useNotifications';
import { formatDistanceToNow } from 'date-fns';

const ICONS: Record<string, React.ReactNode> = {
  connection_request:   <UserPlus    size={12} className="text-blue-500" />,
  connection_accepted:  <UserPlus    size={12} className="text-green-500" />,
  post_liked:           <Heart       size={12} className="text-red-500" />,
  post_commented:       <MessageSquare size={12} className="text-blue-500" />,
  post_reposted:        <MessageSquare size={12} className="text-purple-500" />,
  new_message:          <MessageSquare size={12} className="text-brand" />,
  job_match:            <Briefcase   size={12} className="text-green-500" />,
  certificate_issued:   <ShieldCheck size={12} className="text-brand" />,
  certificate_expiring: <AlertTriangle size={12} className="text-amber-500" />,
  certificate_expired:  <AlertTriangle size={12} className="text-red-500" />,
  application_status:   <Briefcase   size={12} className="text-purple-500" />,
};

function getLabel(n: INotification): string {
  const p  = n.payload as Record<string, unknown>;
  const fu = (p['fromUser'] as { fullName?: string } | undefined)?.fullName ?? 'Someone';

  switch (n.type) {
    case 'connection_request':
      return `${fu} sent you a connection request`;
    case 'connection_accepted':
      return `${fu} accepted your request`;
    case 'post_liked':
      return n.batchCount > 1
        ? `${fu} and ${n.batchCount - 1} others liked your post`
        : `${fu} liked your post`;
    case 'post_commented':
      return `${fu} commented on your post`;
    case 'post_reposted':
      return `${fu} reposted your post`;
    case 'new_message':
      return `${fu} sent you a message`;
    case 'job_match':
      return `New job match: ${(p['job'] as { title?: string } | undefined)?.title ?? 'a role'}`;
    case 'certificate_issued':
      return `Your ${(p['verification'] as { skillName?: string } | undefined)?.skillName ?? ''} skill has been verified!`;
    case 'certificate_expiring':
      return `Your ${(p['verification'] as { skillName?: string } | undefined)?.skillName ?? ''} certificate expires in ${p['daysUntilExpiry']} days`;
    case 'certificate_expired':
      return `Your ${(p['verification'] as { skillName?: string } | undefined)?.skillName ?? ''} certificate has expired`;
    case 'application_status':
      return `Your application status changed to ${p['newStatus']}`;
    default:
      return 'New notification';
  }
}

function getLink(n: INotification): string {
  const p = n.payload as Record<string, unknown>;
  switch (n.type) {
    case 'connection_request':
    case 'connection_accepted':
      return '/network';
    case 'post_liked':
    case 'post_commented':
    case 'post_reposted':
      return '/feed';
    case 'new_message':
      return '/messages';
    case 'job_match':
      return `/jobs/${(p['job'] as { _id?: string } | undefined)?._id ?? ''}`;
    case 'certificate_issued':
    case 'certificate_expiring':
    case 'certificate_expired':
      return '/profile';
    case 'application_status':
      return '/applications';
    default:
      return '/notifications';
  }
}

export default function NotificationItem({ notification }: { notification: INotification }) {
  const markRead = useMarkRead();

  // FIX 7 — extract sender avatar from payload
  const fromUser = (notification.payload as { fromUser?: { profilePhoto?: string; fullName?: string } }).fromUser;

  return (
    <Link
      to={getLink(notification)}
      onClick={() => { if (!notification.isRead) markRead.mutate(notification._id); }}
      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
        notification.isRead ? '' : 'bg-blue-50/40'
      }`}
    >
      {/* FIX 7 — avatar with type-icon overlay */}
      <div className="relative shrink-0 mt-0.5">
        {fromUser?.profilePhoto ? (
          <img
            src={fromUser.profilePhoto}
            alt=""
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            {ICONS[notification.type] ?? <Bell size={16} className="text-gray-400" />}
          </div>
        )}
        {/* Type icon overlay — only shown when there's a real avatar */}
        {fromUser?.profilePhoto && (
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full border border-gray-200 flex items-center justify-center">
            <span className="scale-75">
              {ICONS[notification.type] ?? <Bell size={10} className="text-gray-400" />}
            </span>
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 leading-snug">{getLabel(notification)}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
      )}
    </Link>
  );
}
