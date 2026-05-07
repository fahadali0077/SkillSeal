const BASE = '/api/v1/notifications';
async function apiFetch<T>(url:string,init:RequestInit={}):Promise<T>{
  const res=await fetch(url,{headers:{'Content-Type':'application/json'},credentials:'include',...init});
  const json=await res.json() as{success:boolean;data:T;message:string};
  if(!json.success)throw new Error((json as unknown as{message:string}).message);
  return json.data;
}
export interface INotification{_id:string;type:string;isRead:boolean;payload:Record<string,unknown>;batchCount:number;createdAt:string;}
export const notificationsApi={
  list:(page=1,limit=20)=>apiFetch<{notifications:INotification[];total:number;unreadCount:number}>(`${BASE}?page=${page}&limit=${limit}`),
  unreadCount:()=>apiFetch<{count:number}>(`${BASE}/unread-count`),
  markRead:(id:string)=>apiFetch<null>(`${BASE}/${id}/read`,{method:'PUT'}),
  markAllRead:()=>apiFetch<null>(`${BASE}/read-all`,{method:'PUT'}),
};
