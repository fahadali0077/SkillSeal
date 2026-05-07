import { API_ORIGIN, apiFetch } from '../../lib/apiBase';
const BASE = `${API_ORIGIN}/api/v1/notifications`;
export interface INotification{_id:string;type:string;isRead:boolean;payload:Record<string,unknown>;batchCount:number;createdAt:string;}
export const notificationsApi={
  list:(page=1,limit=20)=>apiFetch<{notifications:INotification[];total:number;unreadCount:number}>(`${BASE}?page=${page}&limit=${limit}`),
  unreadCount:()=>apiFetch<{count:number}>(`${BASE}/unread-count`),
  markRead:(id:string)=>apiFetch<null>(`${BASE}/${id}/read`,{method:'PUT'}),
  markAllRead:()=>apiFetch<null>(`${BASE}/read-all`,{method:'PUT'}),
};
