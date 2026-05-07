import mongoose from 'mongoose';
import { Session } from '../../models/Session.model';
import type { ISessionDocument } from '../../models/Session.model';
import { Answer } from '../../models/Answer.model';
import type { IAnswerDocument } from '../../models/Answer.model';
import { getSession } from '../../utils/redis';
import logger from '../../utils/logger';

const TIER_RANK: Record<string,number>={beginner:1,intermediate:2,advanced:3,expert:4};
const BASELINES: Record<string,Record<string,number>>={
  mcq:{beginner:8,intermediate:6,advanced:5,expert:5},
  scenario:{beginner:22,intermediate:18,advanced:14,expert:14},
  'micro-theory':{beginner:12,intermediate:10,advanced:9,expert:9},
};

export async function computeCompositeScore(sessionId:string){
  const session=await Session.findById(sessionId).lean<ISessionDocument>();
  if(!session)throw new Error('Session not found');
  const redisState=await getSession(sessionId);
  const strikeCount=redisState?.strikeCount??session.strikeCount??0;

  const answers=await Answer.find({sessionId:new mongoose.Types.ObjectId(sessionId)}).lean<IAnswerDocument[]>();
  if(!answers.length){
    return{scores:{compositeScore:0,conceptScore:0,speedScore:0,consistencyScore:0,behaviorScore:100,aiScore:100,aiProbability:0},finalTier:null,retakeAfterDays:14};
  }

  // Concept score
  const graded=answers.filter(a=>a.isCorrect!==null);
  const conceptScore=graded.length>0?Math.round((graded.filter(a=>a.isCorrect).length/graded.length)*100):0;

  // Speed score
  const speedScores=answers.map(a=>{
    const tier=session.declaredTier||'intermediate';
    const baseline=(BASELINES[a.questionType]?.[tier]??8)*1000;
    return a.isTimeout?0:Math.max(0,1-a.timeTaken/baseline);
  });
  const speedScore=Math.round((speedScores.reduce((s,v)=>s+v,0)/answers.length)*100);

  // Consistency score
  const byDiff: Record<string,{correct:number;total:number}>={};
  answers.forEach(a=>{
    const d=a.difficulty||'medium';
    if(!byDiff[d])byDiff[d]={correct:0,total:0};
    byDiff[d].total++;
    if(a.isCorrect)byDiff[d].correct++;
  });
  const accs=Object.values(byDiff).map(v=>v.total>0?v.correct/v.total:0);
  const mean=accs.reduce((s,v)=>s+v,0)/Math.max(1,accs.length);
  const stdDev=Math.sqrt(accs.reduce((s,v)=>s+(v-mean)**2,0)/Math.max(1,accs.length));
  const consistencyScore=Math.max(0,Math.round(100-stdDev*100));

  // Behavior score
  let deductions=0;
  if(strikeCount>=2)deductions+=10;
  const behaviorScore=Math.max(0,100-deductions);

  // AI score
  const microAnswers=answers.filter(a=>a.questionType==='micro-theory');
  const aiScore=microAnswers.length===0?100:Math.round((1-microAnswers.reduce((s,a)=>s+(a.aiScore??0),0)/microAnswers.length)*100);
  const aiProbability=microAnswers.length===0?0:microAnswers.reduce((s,a)=>s+(a.aiScore??0),0)/microAnswers.length;

  const compositeScore=Math.round(conceptScore*0.40+speedScore*0.20+consistencyScore*0.15+behaviorScore*0.15+aiScore*0.10);

  // Final tier
  const tierGroups: Record<string,{correct:number;total:number}>={};
  answers.forEach(a=>{
    const t=(a as {tier?:string}).tier||session.declaredTier;
    if(!tierGroups[t])tierGroups[t]={correct:0,total:0};
    tierGroups[t].total++;
    if(a.isCorrect)tierGroups[t].correct++;
  });
  let finalTier: string|null=null;
  const tierOrder=['expert','advanced','intermediate','beginner'];
  for(const t of tierOrder){
    const g=tierGroups[t];
    if(g&&g.total>=5&&g.correct/g.total>=0.7){finalTier=t;break;}
  }
  if(!finalTier&&compositeScore>=70)finalTier=session.finalTier||session.declaredTier;

  const retakeAfterDays=compositeScore>=70?0:compositeScore>=50?7:14;
  return{scores:{compositeScore,conceptScore,speedScore,consistencyScore,behaviorScore,aiScore,aiProbability},finalTier,retakeAfterDays};
}
