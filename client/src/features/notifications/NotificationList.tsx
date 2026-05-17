import { CheckCheck, Bell } from 'lucide-react';
import { useNotifications, useMarkAllRead } from './useNotifications';
import NotificationItem from './NotificationItem';

export default function NotificationList() {
  const { data, isLoading } = useNotifications();
  const markAll = useMarkAllRead();
  const notifications = data?.notifications ?? [];

  if (isLoading) {
    return (
      <div className="divide-y divide-gray-100">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-start gap-3 px-4 py-3">
            <div className="skeleton w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-3/4 rounded" />
              <div className="skeleton h-2.5 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!notifications.length) {
    return (
      <div className="py-10 px-4 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Bell size={20} className="text-gray-400" />
        </div>
        <p className="font-semibold text-gray-700 text-sm mb-1">No notifications yet</p>
        <p className="text-xs text-gray-400">You're all caught up</p>
      </div>
    );
  }

  return (
    <div>
      {data?.unreadCount && data.unreadCount > 0 ? (
        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            {data.unreadCount} unread
          </span>
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="text-xs text-brand hover:text-brand-dark flex items-center gap-1 font-medium disabled:opacity-50 transition-colors"
          >
            <CheckCheck size={12} /> Mark all read
          </button>
        </div>
      ) : null}
      <div className="divide-y divide-gray-100">
        {notifications.map(n => <NotificationItem key={n._id} notification={n} />)}
      </div>
    </div>
  );
}
