import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
const BASE='/api/v1/connections';
async function apiFetch<T>(url:string,init:RequestInit={}):Promise<T>{const res=await fetch(url,{headers:{'Content-Type':'application/json'},credentials:'include',...init});const json=await res.json() as{success:boolean;data:T};if(!json.success)throw new Error('API error');return json.data;}
export const connKeys={pending:()=>['connections','pending'] as const,connections:()=>['connections','list'] as const,suggestions:()=>['suggestions'] as const,sent:()=>['connections','sent'] as const};
export function usePendingRequests(){return useQuery({queryKey:connKeys.pending(),queryFn:()=>apiFetch<{_id:string;requesterId:{_id:string;fullName:string;profilePhoto:string;headline:string;customUrl:string}}[]>(`${BASE}/requests/pending`),staleTime:30_000});}
export function useConnections(search?:string){return useQuery({queryKey:[...connKeys.connections(),search],queryFn:()=>apiFetch<{_id:string;firstName:string;lastName:string;profilePhoto:string;headline:string;customUrl:string}[]>(`${BASE}?${search?`search=${encodeURIComponent(search)}`:''}`),staleTime:60_000});}
export function useSuggestions(){return useQuery({queryKey:connKeys.suggestions(),queryFn:()=>apiFetch<{_id:string;firstName:string;lastName:string;profilePhoto:string;headline:string;customUrl:string;mutualConnections:number}[]>('/api/v1/suggestions'),staleTime:5*60_000});}
export function useSendRequest(){const qc=useQueryClient();return useMutation({mutationFn:({recipientId,note}:{recipientId:string;note?:string})=>apiFetch<{_id:string}>(`${BASE}/requests`,{method:'POST',body:JSON.stringify({recipientId,note})}),onSuccess:()=>{qc.invalidateQueries({queryKey:connKeys.sent()});qc.invalidateQueries({queryKey:connKeys.suggestions()});}});}
export function useAcceptRequest(){const qc=useQueryClient();return useMutation({mutationFn:(requestId:string)=>apiFetch<null>(`${BASE}/requests/${requestId}/accept`,{method:'POST'}),onSuccess:()=>{qc.invalidateQueries({queryKey:connKeys.pending()});qc.invalidateQueries({queryKey:connKeys.connections()});}});}
export function useDeclineRequest(){const qc=useQueryClient();return useMutation({mutationFn:(requestId:string)=>apiFetch<null>(`${BASE}/requests/${requestId}/ignore`,{method:'POST'}),onSuccess:()=>qc.invalidateQueries({queryKey:connKeys.pending()})});}
export function useRemoveConnection(){const qc=useQueryClient();return useMutation({mutationFn:(userId:string)=>apiFetch<null>(`${BASE}/${userId}`,{method:'DELETE'}),onSuccess:()=>qc.invalidateQueries({queryKey:connKeys.connections()})});}
export function useBlockUser(){const qc=useQueryClient();return useMutation({mutationFn:(userId:string)=>apiFetch<null>(`${BASE}/block/${userId}`,{method:'POST'}),onSuccess:()=>qc.invalidateQueries({queryKey:connKeys.suggestions()})});}
export function getConnectionDegree(_:string,__:string):Promise<'1st'|'2nd'|'3rd'|'none'>{return Promise.resolve('none');}

// ── Follow/Unfollow hooks ─────────────────────────────────────────────────────
export function useFollowUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiFetch<null>(`/api/v1/users/${userId}/follow`, { method: 'POST' }),
    onSuccess: (_, userId) => { qc.invalidateQueries({ queryKey: ['profile', userId] }); },
  });
}

export function useUnfollowUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiFetch<null>(`/api/v1/users/${userId}/follow`, { method: 'DELETE' }),
    onSuccess: (_, userId) => { qc.invalidateQueries({ queryKey: ['profile', userId] }); },
  });
}
