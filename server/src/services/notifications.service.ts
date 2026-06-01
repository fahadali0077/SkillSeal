import { Types } from 'mongoose';
import { Notification } from '../models/Notification.model';
import logger from '../utils/logger';
export type NotificationType = 'connection_request'|'connection_accepted'|'post_liked'|'post_commented'|'post_reposted'|'new_message'|'job_match'|'certificate_issued'|'certificate_expiring'|'certificate_expired'|'application_status';
const BATCH_WINDOW_MS=15*60*1000;
import { emitToUser, SOCKET_EVENTS } from '../socket/socket';
function serialize(doc: Record<string,unknown>){ return doc; }
export async function createNotification(recipientId:string,type:NotificationType,payload:Record<string,unknown>){
  const postId=(payload['postId'] as string|undefined);
  const batchKey=['post_liked'].includes(type)&&postId?`${type}:${postId}`:'';
  if(batchKey){
    const existing=await Notification.findOne({recipientId:new Types.ObjectId(recipientId),batchKey,createdAt:{$gte:new Date(Date.now()-BATCH_WINDOW_MS)}});
    if(existing){existing.batchCount+=1;existing.isRead=false;await existing.save();try{emitToUser(recipientId,SOCKET_EVENTS.NOTIFICATION,existing);}catch{}return existing;}
  }
  const doc=await Notification.create({recipientId:new Types.ObjectId(recipientId),type,payload,isRead:false,batchKey,batchCount:1});
  try{emitToUser(recipientId,SOCKET_EVENTS.NOTIFICATION,doc);}catch{}
  return doc;
}
export const notify={
  connectionRequest:(rid:string,p:Record<string,unknown>)=>createNotification(rid,'connection_request',{fromUser:p}),
  connectionAccepted:(rid:string,p:Record<string,unknown>)=>createNotification(rid,'connection_accepted',{fromUser:p}),
  postLiked:(rid:string,fu:Record<string,unknown>,postId:string,postPreview:string)=>createNotification(rid,'post_liked',{fromUser:fu,postId,postPreview,label:'1 person liked your post'}),
  postCommented:(rid:string,fu:Record<string,unknown>,postId:string,commentPreview:string)=>createNotification(rid,'post_commented',{fromUser:fu,postId,commentPreview}),
  postReposted:(rid:string,fu:Record<string,unknown>,postId:string)=>createNotification(rid,'post_reposted',{fromUser:fu,postId}),
  newMessage:(rid:string,fu:Record<string,unknown>,threadId:string,messagePreview:string)=>createNotification(rid,'new_message',{fromUser:fu,threadId,messagePreview}),
  jobMatch:(rid:string,job:Record<string,unknown>)=>createNotification(rid,'job_match',{job}),
  certificateIssued:(rid:string,verif:Record<string,unknown>)=>createNotification(rid,'certificate_issued',{verification:verif}),
  certificateExpiring:(rid:string,verif:Record<string,unknown>,days:number)=>createNotification(rid,'certificate_expiring',{verification:verif,daysUntilExpiry:days}),
  certificateExpired:(rid:string,verif:Record<string,unknown>)=>createNotification(rid,'certificate_expired',{verification:verif}),
  applicationStatus:(rid:string,job:Record<string,unknown>,newStatus:string)=>createNotification(rid,'application_status',{job,newStatus}),
};
export async function listNotifications(userId:string,page=1,limit=20){
  const skip=(page-1)*limit;
  const uid=new Types.ObjectId(userId);
  const[docs,total,unreadCount]=await Promise.all([
    Notification.find({recipientId:uid}).sort({createdAt:-1}).skip(skip).limit(limit).lean(),
    Notification.countDocuments({recipientId:uid}),
    Notification.countDocuments({recipientId:uid,isRead:false}),
  ]);
  return{notifications:docs,total,unreadCount};
}
export async function getUnreadCount(userId:string){return Notification.countDocuments({recipientId:new Types.ObjectId(userId),isRead:false});}
export async function markRead(id:string,userId:string){await Notification.findOneAndUpdate({_id:id,recipientId:new Types.ObjectId(userId)},{isRead:true});}
export async function markAllRead(userId:string){await Notification.updateMany({recipientId:new Types.ObjectId(userId),isRead:false},{isRead:true});}
