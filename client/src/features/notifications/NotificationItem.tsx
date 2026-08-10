import { Link } from 'react-router-dom';
import {
  ShieldCheck, UserPlus, Heart, MessageSquare,
  Briefcase, Bell, AlertTriangle,
} from 'lucide-react';
import type { INotification } from './notificationsApi';
import { useMarkRead } from './useNotifications';
import { formatDistanceToNow } from 'date-fns';

const ICONS: Record<string, React.ReactNode> = {
  connection_request:   <UserPlus    size={11} className="text-blue-500" />,
  connection_accepted:  <UserPlus    size={11} className="text-green-500" />,
  post_liked:           <Heart       size={11} className="text-red-500" />,
  post_commented:       <MessageSquare size={11} className="text-blue-500" />,
  post_reposted:        <MessageSquare size={11} className="text-purple-500" />,
  new_message:          <MessageSquare size={11} className="text-brand" />,
  job_match:            <Briefcase   size={11} className="text-green-500" />,
  certificate_issued:   <ShieldCheck size={11} className="text-brand" />,
  certificate_expiring: <AlertTriangle size={11} className="text-amber-500" />,
  certificate_expired:  <AlertTriangle size={11} className="text-red-500" />,
  application_status:   <Briefcase   size={11} className="text-purple-500" />,
};

const FALLBACK_BG: Record<string, string> = {
  connection_request:   'bg-blue-50',
  connection_accepted:  'bg-green-50',
  post_liked:           'bg-red-50',
  post_commented:       'bg-blue-50',
  post_reposted:        'bg-purple-50',
  new_message:          'bg-blue-50',
  job_match:            'bg-green-50',
  certificate_issued:   'bg-blue-50',
  certificate_expiring: 'bg-amber-50',
  certificate_expired:  'bg-red-50',
  application_status:   'bg-purple-50',
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

  const fromUser = (notification.payload as { fromUser?: { profilePhoto?: string; fullName?: string } }).fromUser;
  const fallbackBg = FALLBACK_BG[notification.type] ?? 'bg-gray-100';

  return (
    <Link
      to={getLink(notification)}
      onClick={() => { if (!notification.isRead) markRead.mutate(notification._id); }}
      className={`relative flex items-start gap-3 px-4 py-3.5 transition-colors group ${
        notification.isRead ? 'hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50/60'
      }`}
    >
      {/* Brand left-stripe for unread */}
      {!notification.isRead && (
        <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand" />
      )}

      {/* Avatar with type-icon overlay */}
      <div className="relative shrink-0 mt-0.5">
        {fromUser?.profilePhoto ? (
          <img
            src={fromUser.profilePhoto}
            alt=""
            className="w-10 h-10 rounded-full object-cover ring-1 ring-paper-card shadow-sm"
          />
        ) : (
          <div className={`w-10 h-10 rounded-full ${fallbackBg} flex items-center justify-center ring-1 ring-paper-card shadow-sm`}>
            {ICONS[notification.type] ?? <Bell size={16} className="text-gray-400" />}
          </div>
        )}
        {/* Type icon overlay — only shown when there's a real avatar */}
        {fromUser?.profilePhoto && (
          <span className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 ${fallbackBg} rounded-full ring-1 ring-paper-card flex items-center justify-center shadow-sm`}>
            {ICONS[notification.type] ?? <Bell size={10} className="text-gray-400" />}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${notification.isRead ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
          {getLabel(notification)}
        </p>
        <p className="text-[11px] text-gray-400 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-brand mt-2 shrink-0 shadow-[0_0_0_3px_rgba(14,26,43,0.06)]" />
      )}
    </Link>
  );
}
