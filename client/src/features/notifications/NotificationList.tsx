import { Loader2, CheckCheck } from 'lucide-react';
import { useNotifications, useMarkAllRead } from './useNotifications';
import NotificationItem from './NotificationItem';
export default function NotificationList(){
  const{data,isLoading}=useNotifications();const markAll=useMarkAllRead();const notifications=data?.notifications??[];
  if(isLoading)return <div className="flex justify-center py-8 text-gray-300"><Loader2 size={20} className="animate-spin"/></div>;
  if(!notifications.length)return <div className="py-8 text-center text-gray-400 text-sm">No notifications yet.</div>;
  return(<div>
    {data?.unreadCount&&data.unreadCount>0?(<div className="px-4 py-2 border-b border-gray-100 flex justify-end"><button onClick={()=>markAll.mutate()} className="text-xs text-brand hover:text-brand-dark flex items-center gap-1"><CheckCheck size={12}/>Mark all read</button></div>):null}
    <div className="divide-y divide-gray-100">{notifications.map(n=><NotificationItem key={n._id} notification={n}/>)}</div>
  </div>);
}
