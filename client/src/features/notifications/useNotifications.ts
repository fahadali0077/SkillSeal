import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../auth/useAuth';
import { notificationsApi, type INotification } from './notificationsApi';
import { on, SOCKET_EVENTS } from '../../lib/socketClient';
// PARTIAL-08: exported so NotificationsPage can drive its own paginated queries
// for the "Load more" button.
export const NOTIF_KEY = ['notifications'];
export { notificationsApi };
const COUNT_KEY  = ['notifications', 'count'];
export function useNotifications(page=1){return useQuery({queryKey:[...NOTIF_KEY,page],queryFn:()=>notificationsApi.list(page),staleTime:30_000});}
export function useUnreadCount(){return useQuery({queryKey:COUNT_KEY,queryFn:notificationsApi.unreadCount,staleTime:60_000,refetchInterval:60_000});}
export function useMarkRead(){const qc=useQueryClient();return useMutation({mutationFn:(id:string)=>notificationsApi.markRead(id),onSuccess:()=>{qc.invalidateQueries({queryKey:NOTIF_KEY});qc.invalidateQueries({queryKey:COUNT_KEY});}});}
export function useMarkAllRead(){const qc=useQueryClient();return useMutation({mutationFn:notificationsApi.markAllRead,onSuccess:()=>{qc.invalidateQueries({queryKey:NOTIF_KEY});qc.invalidateQueries({queryKey:COUNT_KEY});}});}
export function useNotificationSocket(){
  const{user}=useAuthStore();const qc=useQueryClient();
  const handleNew=useCallback((_notif:INotification)=>{qc.invalidateQueries({queryKey:NOTIF_KEY});qc.invalidateQueries({queryKey:COUNT_KEY});},[qc]);
  useEffect(()=>{if(!user)return;const off=on<INotification>(SOCKET_EVENTS.NOTIFICATION,handleNew);return off;},[user,handleNew]);
}
