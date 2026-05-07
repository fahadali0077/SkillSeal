import { io, type Socket } from 'socket.io-client';
let socket: Socket | null = null;
export const SOCKET_EVENTS = { SESSION_ACTION:'session_action', NOTIFICATION:'notification', JOIN_ROOM:'join_room', NEW_MESSAGE:'new_message', TYPING:'typing', STOP_TYPING:'stop_typing', TYPING_START:'typing_start', TYPING_STOP:'typing_stop', USER_ONLINE:'user_online', USER_OFFLINE:'user_offline' } as const;
export function connectSocket(token:string):void{
  if(socket?.connected)return;
  socket=io('/',{auth:{token},transports:['websocket','polling'],reconnection:true,reconnectionAttempts:5,reconnectionDelay:2000});
  socket.on('connect',()=>console.info('[socket] connected:',socket?.id));
  socket.on('disconnect',(reason:string)=>console.info('[socket] disconnected:',reason));
}
export function disconnectSocket():void{socket?.disconnect();socket=null;}
export function emit(event:string,data?:unknown):void{socket?.emit(event,data);}
export function on<T=unknown>(event:string,handler:(data:T)=>void):()=>void{
  socket?.on(event,handler as (data:unknown)=>void);
  return()=>socket?.off(event,handler as (data:unknown)=>void);
}
export function emitToRoom(room:string):void{socket?.emit(SOCKET_EVENTS.JOIN_ROOM,room);}

export function getSocket() { return socket; }
