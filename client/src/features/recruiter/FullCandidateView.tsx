import {useState} from 'react';
import {useParams,Link} from 'react-router-dom';
import {motion} from 'framer-motion';
import {ArrowLeft,MapPin,ShieldCheck,AlertTriangle,ExternalLink,Loader2,Eye} from 'lucide-react';
import {useCandidate,useUpsertPipeline,type IVerificationFull} from './recruiterApi';
import SessionAuditDrawer from './SessionAuditDrawer';
const TIER_COLORS:Record<string,string>={beginner:'bg-gray-100 text-gray-700',intermediate:'bg-blue-50 text-brand',advanced:'bg-purple-50 text-purple-700',expert:'bg-amber-50 text-amber-700'};
const STATUS_COLORS:Record<string,string>={VERIFIED:'text-green-600',FLAGGED:'text-amber-600',EXPIRED:'text-gray-400',REVOKED:'text-red-500'};
const STAGES=['shortlisted','contacted','interviewing','offer','rejected'] as const;
function ScoreBar({label,value,color}:{label:string;value:number;color:string}){return(<div className="space-y-0.5"><div className="flex justify-between text-xs"><span className="text-gray-500">{label}</span><span className="font-medium tabular-nums" style={{color}}>{value}</span></div><div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${value}%`,background:color}}/></div></div>);}
function VerifRow({v,onAudit}:{v:IVerificationFull;onAudit:(s:string)=>void}){
  const[expanded,setExpanded]=useState(false);
  return(<div className="border border-gray-200 rounded-xl overflow-hidden">
    <button onClick={()=>setExpanded(e=>!e)} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 text-left">
      <ShieldCheck size={16} className={STATUS_COLORS[v.status]??'text-gray-400'}/>
      <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="font-medium text-sm text-gray-900">{v.skillName}</span><span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${TIER_COLORS[v.tier]??''}`}>{v.tier}</span><span className={`text-xs font-semibold ${STATUS_COLORS[v.status]}`}>{v.status}</span>{v.aiProbability>0.4&&<span className="text-xs text-amber-600 flex items-center gap-0.5"><AlertTriangle size={11}/>AI flag</span>}</div><p className="text-xs text-gray-400 mt-0.5">{new Date(v.issuedAt).toLocaleDateString()}</p></div>
      <div className="text-right shrink-0"><p className="text-xl font-bold text-gray-900 tabular-nums">{v.compositeScore}</p><p className="text-xs text-gray-400">/100</p></div>
    </button>
    {expanded&&<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} className="px-4 pb-4 space-y-2.5 border-t border-gray-100 pt-3">
      <ScoreBar label="Concept accuracy" value={v.conceptScore} color="#3b82f6"/><ScoreBar label="Speed" value={v.speedScore} color="#8b5cf6"/><ScoreBar label="Consistency" value={v.consistencyScore} color="#06b6d4"/><ScoreBar label="Integrity" value={v.behaviorScore} color="#10b981"/><ScoreBar label="AI authenticity" value={v.aiScore} color="#f59e0b"/>
      {v.aiProbability>0&&<p className="text-xs text-gray-500">AI probability: <span className={v.aiProbability>0.4?'text-red-500 font-semibold':'text-gray-600'}>{Math.round(v.aiProbability*100)}%</span></p>}
      {v.flagReason&&<p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1">{v.flagReason}</p>}
      <button onClick={()=>onAudit(v.sessionId)} className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-dark font-medium mt-2"><Eye size={13}/>View full audit trail</button>
    </motion.div>}
  </div>);
}
export default function FullCandidateView(){
  const{userId=''}=useParams<{userId:string}>();const{data,isLoading}=useCandidate(userId);
  const upsert=useUpsertPipeline();const[auditId,setAuditId]=useState<string|null>(null);const[pipeStatus,setPipeStatus]=useState('');const[note,setNote]=useState('');const[saved,setSaved]=useState(false);
  if(isLoading)return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-gray-300"/></div>;
  if(!data)return <div className="max-w-3xl mx-auto px-4 py-10 text-center text-gray-400">Candidate not found.</div>;
  const{profile,verifications,pipelineEntry}=data;
  const handleUpdate=async()=>{if(!pipeStatus)return;await upsert.mutateAsync({candidateId:userId,status:pipeStatus,note:note||undefined});setSaved(true);setTimeout(()=>setSaved(false),2000);};
  return(<>
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <Link to="/recruiter" className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand"><ArrowLeft size={15}/>Back to talent search</Link>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-5 text-center">
            {profile.profilePhoto?<img src={profile.profilePhoto} alt={profile.firstName} className="w-20 h-20 rounded-full object-cover mx-auto mb-3"/>:<div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center font-bold text-brand text-2xl mx-auto mb-3">{profile.firstName[0]}</div>}
            <h1 className="font-bold text-gray-900">{profile.firstName} {profile.lastName}</h1><p className="text-sm text-gray-500 mt-0.5">{profile.headline}</p>
            {profile.location.city&&<p className="text-xs text-gray-400 flex items-center gap-1 justify-center mt-1"><MapPin size={11}/>{profile.location.city}</p>}
            {profile.openToWork&&<span className="inline-block text-xs font-medium px-2 py-0.5 mt-2 bg-green-50 text-green-700 border border-green-200 rounded-full">Open to work</span>}
            <Link to={`/profile/${profile.customUrl||profile._id}`} target="_blank" className="flex items-center justify-center gap-1 text-xs text-brand hover:underline mt-3"><ExternalLink size={11}/>View profile</Link>
          </div>
          <div className="card p-5 space-y-3"><h3 className="font-semibold text-sm text-gray-700">Pipeline status</h3>
            <select defaultValue={pipelineEntry?.status??''} onChange={e=>setPipeStatus(e.target.value)} className="input text-sm w-full"><option value="">Select stage…</option>{STAGES.map(s=><option key={s} value={s} className="capitalize">{s}</option>)}</select>
            <textarea defaultValue={pipelineEntry?.note??''} onChange={e=>setNote(e.target.value)} placeholder="Private notes…" rows={3} className="input resize-none text-sm w-full"/>
            <button onClick={handleUpdate} disabled={!pipeStatus||upsert.isPending} className="btn-primary w-full text-sm">{saved?'✓ Saved':upsert.isPending?'Saving…':'Update pipeline'}</button>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-gray-900">Verification history <span className="text-gray-400 font-normal text-sm">({verifications.length} session{verifications.length!==1?'s':''})</span></h2>
          {verifications.length===0?(<div className="card p-8 text-center text-gray-400"><ShieldCheck size={32} className="mx-auto mb-2 opacity-30"/><p>No verified skills yet.</p></div>):(<div className="space-y-3">{verifications.map(v=><VerifRow key={v._id} v={v} onAudit={sid=>setAuditId(sid)}/>)}</div>)}
        </div>
      </div>
    </div>
    {auditId&&<SessionAuditDrawer sessionId={auditId} onClose={()=>setAuditId(null)}/>}
  </>);
}
