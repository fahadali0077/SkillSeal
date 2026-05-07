import {useState} from 'react';
import {Link} from 'react-router-dom';
import {motion,AnimatePresence} from 'framer-motion';
import {ShieldCheck,ShieldAlert,ShieldX,AlertTriangle,Download,CheckSquare,Loader2} from 'lucide-react';
import {usePipeline,useUpsertPipeline,useExportCsv,type IPipelineCandidate,type IntegrityLevel} from './recruiterApi';
const STAGES=['shortlisted','contacted','interviewing','offer','rejected'] as const;
type Stage=typeof STAGES[number];
const STAGE_CONFIG:Record<Stage,{label:string;color:string;headerBg:string}>={shortlisted:{label:'Shortlisted',color:'text-blue-600',headerBg:'bg-blue-50'},contacted:{label:'Contacted',color:'text-purple-600',headerBg:'bg-purple-50'},interviewing:{label:'Interviewing',color:'text-amber-600',headerBg:'bg-amber-50'},offer:{label:'Offer',color:'text-green-600',headerBg:'bg-green-50'},rejected:{label:'Rejected',color:'text-red-500',headerBg:'bg-red-50'}};
function Icon({level}:{level:IntegrityLevel}){if(level==='green')return <ShieldCheck size={13} className="text-green-500"/>;if(level==='yellow')return <ShieldAlert size={13} className="text-amber-500"/>;return <ShieldX size={13} className="text-red-500"/>;}
function PCard({candidate,onMove,selected,onSelect}:{candidate:IPipelineCandidate;onMove:(id:string,s:Stage)=>void;selected:boolean;onSelect:(id:string)=>void;}){
  return(<motion.div layout initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.96}} className={`bg-white rounded-xl border p-3 shadow-sm space-y-2 ${selected?'border-brand ring-2 ring-brand/20':'border-gray-200'}`}>
    <div className="flex items-center gap-2"><input type="checkbox" checked={selected} onChange={()=>onSelect(candidate.applicationId)} className="accent-brand shrink-0"/>
      {candidate.profilePhoto?<img src={candidate.profilePhoto} alt={candidate.fullName} className="w-8 h-8 rounded-full object-cover shrink-0"/>:<div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold shrink-0">{candidate.fullName[0]}</div>}
      <div className="flex-1 min-w-0"><Link to={`/recruiter/candidates/${candidate.candidateId}`} className="text-sm font-semibold text-gray-900 hover:text-brand truncate block">{candidate.fullName}</Link><p className="text-xs text-gray-400 truncate">{candidate.headline}</p></div>
      <div className="flex items-center gap-1 shrink-0"><Icon level={candidate.behaviorIntegrity}/>{candidate.aiFlag&&<AlertTriangle size={12} className="text-amber-500"/>}</div>
    </div>
    {candidate.verifiedSkills.length>0&&<div className="flex flex-wrap gap-1">{candidate.verifiedSkills.slice(0,2).map(s=>(<span key={s.skillId} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-brand border border-blue-200"><ShieldCheck size={8} className="inline mr-0.5"/>{s.skillName}</span>))}</div>}
    <select value={candidate.status} onChange={e=>onMove(candidate.applicationId,e.target.value as Stage)} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 focus:border-brand outline-none">{STAGES.map(s=><option key={s} value={s} className="capitalize">{s}</option>)}</select>
  </motion.div>);
}
export default function PipelineView({jobId}:{jobId?:string}={}){
  const{data:pipeline,isLoading}=usePipeline(jobId);const upsert=useUpsertPipeline();const exportCsv=useExportCsv();const[selected,setSelected]=useState<Set<string>>(new Set());
  const handleMove=async(appId:string,newStatus:Stage)=>{const cand=Object.values(pipeline??{}).flat().find(c=>c.applicationId===appId);if(!cand)return;await upsert.mutateAsync({candidateId:cand.candidateId,status:newStatus,jobId});};
  const toggleSelect=(id:string)=>setSelected(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n;});
  const totalCount=Object.values(pipeline??{}).flat().length;
  if(isLoading)return <div className="flex justify-center py-12 text-gray-300"><Loader2 size={24} className="animate-spin"/></div>;
  return(<div className="space-y-4">
    <div className="flex items-center gap-3"><button onClick={()=>setSelected(new Set(Object.values(pipeline??{}).flat().map(c=>c.applicationId)))} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand"><CheckSquare size={15}/>Select all ({totalCount})</button>{selected.size>0&&<motion.div initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} className="flex items-center gap-2"><span className="text-sm text-brand font-medium">{selected.size} selected</span><button onClick={()=>exportCsv.mutate({jobId})} className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-brand px-3 py-1.5 rounded-lg border hover:border-brand"><Download size={13}/>Export CSV</button></motion.div>}</div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 overflow-x-auto pb-2">
      {STAGES.map(stage=>{const cards=pipeline?.[stage]??[];const cfg=STAGE_CONFIG[stage];return(<div key={stage} className="flex flex-col gap-2 min-w-[200px]">
        <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${cfg.headerBg}`}><span className={`text-xs font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span><span className={`text-xs font-bold ${cfg.color} bg-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center`}>{cards.length}</span></div>
        <AnimatePresence mode="popLayout">{cards.length===0?(<div key="empty" className="flex-1 border-2 border-dashed border-gray-200 rounded-xl p-4 text-center text-xs text-gray-300">Empty</div>):(<div className="space-y-2">{cards.map(c=>(<PCard key={c.applicationId} candidate={c} onMove={handleMove} selected={selected.has(c.applicationId)} onSelect={toggleSelect}/>))}</div>)}</AnimatePresence>
      </div>);})}
    </div>
  </div>);
}
