import cron from 'node-cron';
import { Verification } from '../models/Verification.model';
import type { IVerificationDocument } from '../models/Verification.model';
import { User } from '../models/User.model';
import { notify } from '../services/notifications.service';
import logger from '../utils/logger';
async function processExpiring():Promise<void>{
  for(const days of [30,7,1]){
    const start=new Date();start.setUTCDate(start.getUTCDate()+days);start.setUTCHours(0,0,0,0);
    const end=new Date(start);end.setUTCHours(23,59,59,999);
    const docs=await Verification.find({status:'VERIFIED',expiresAt:{$gte:start,$lte:end}}).lean<IVerificationDocument[]>();
    for(const v of docs){
      await notify.certificateExpiring(v.userId.toString(),{_id:v._id.toString(),skillId:v.skillId.toString(),tier:v.tier,compositeScore:v.compositeScore,expiresAt:v.expiresAt.toISOString(),status:v.status},days);
    }
    logger.info(`[certJob] Expiry @${days}d: ${docs.length} notified`);
  }
}
async function processExpired():Promise<void>{
  const now=new Date();
  const docs=await Verification.find({status:'VERIFIED',expiresAt:{$lt:now}}).lean<IVerificationDocument[]>();
  for(const v of docs){
    await Verification.findByIdAndUpdate(v._id,{status:'EXPIRED'});
    await User.updateOne({_id:v.userId,'skills.verificationId':v._id},{$set:{'skills.$.status':'expired'}});
    await notify.certificateExpired(v.userId.toString(),{_id:v._id.toString(),tier:v.tier,expiresAt:v.expiresAt.toISOString()});
  }
  logger.info(`[certJob] Expired: ${docs.length} updated`);
}
export function startCertificateExpiryJob():void{
  cron.schedule('0 8 * * *',async()=>{
    logger.info('[certJob] Starting...');
    try{await processExpiring();await processExpired();logger.info('[certJob] Done.');}
    catch(err){logger.error('[certJob] Error:',err);}
  },{timezone:'UTC'});
  logger.info('[certJob] Scheduled daily 08:00 UTC');
}
export async function runNow():Promise<void>{await processExpiring();await processExpired();}
