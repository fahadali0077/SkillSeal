import cron from 'node-cron';
import { Verification } from '../models/Verification.model';
import type { IVerificationDocument } from '../models/Verification.model';
import { User } from '../models/User.model';
import type { IUserDocument } from '../models/User.model';
import { Skill } from '../models/Skill.model';
import type { ISkillDocument } from '../models/Skill.model';
import { notify } from '../services/notifications.service';
import { sendCertificateExpiryEmail } from '../services/email.service';
import logger from '../utils/logger';

// Helper: best-effort email — never throws.
async function emailExpiry(userId: unknown, skillId: unknown, daysUntilExpiry: number): Promise<void> {
  try {
    const [user, skill] = await Promise.all([
      User.findById(userId).select('email firstName').lean<Pick<IUserDocument, 'email' | 'firstName'>>(),
      Skill.findById(skillId).select('name').lean<Pick<ISkillDocument, 'name'>>(),
    ]);
    if (!user?.email || !skill?.name) return;
    await sendCertificateExpiryEmail({ to: user.email, firstName: user.firstName, skillName: skill.name, daysUntilExpiry });
  } catch (err) {
    logger.warn(`[certJob] expiry email failed: ${(err as Error).message}`);
  }
}

async function processExpiring():Promise<void>{
  for(const days of [30,7,1]){
    const start=new Date();start.setUTCDate(start.getUTCDate()+days);start.setUTCHours(0,0,0,0);
    const end=new Date(start);end.setUTCHours(23,59,59,999);
    const docs=await Verification.find({status:'VERIFIED',expiresAt:{$gte:start,$lte:end}}).lean<IVerificationDocument[]>();
    for(const v of docs){
      await notify.certificateExpiring(v.userId.toString(),{_id:v._id.toString(),skillId:v.skillId.toString(),tier:v.tier,compositeScore:v.compositeScore,expiresAt:v.expiresAt.toISOString(),status:v.status},days);
      // HIGH-14: also email the user.
      await emailExpiry(v.userId, v.skillId, days);
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
    // CRIT-05: also remove the denormalized verifiedSkillsSummary entry so recruiter
    // search no longer shows the expired skill as valid.
    await User.updateOne({_id:v.userId},{$pull:{verifiedSkillsSummary:{skillId:v.skillId}}});
    await notify.certificateExpired(v.userId.toString(),{_id:v._id.toString(),tier:v.tier,expiresAt:v.expiresAt.toISOString()});
    // HIGH-14: email the user that their certificate has expired (daysUntilExpiry = 0).
    await emailExpiry(v.userId, v.skillId, 0);
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
