import {useState} from 'react';
import {Link} from 'react-router-dom';
import {motion} from 'framer-motion';
import {MapPin,ShieldCheck,ShieldAlert,ShieldX,Info,MessageSquare,UserPlus,CheckCircle2} from 'lucide-react';
import type {ICandidateCard,IntegrityLevel} from './recruiterApi';
import {useUpsertPipeline} from './recruiterApi';
function IntegrityBadge({level}:{level:IntegrityLevel}){
  const cfg={green:{icon:<ShieldCheck size={13}/>,label:'High integrity',cls:'text-green-600 bg-green-50 border-green-200'},yellow:{icon:<ShieldAlert size={13}/>,label:'Some concerns',cls:'text-amber-600 bg-amber-50 border-amber-200'},red:{icon:<ShieldX size={13}/>,label:'Integrity flag',cls:'text-red-600 bg-red-50 border-red-200'}}[level];
  return <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.icon}{cfg.label}</span>;
}
function AIFlag(){const[show,setShow]=useState(false);return(<div className="relative" onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}><button className="text-amber-500 hover:text-amber-600 p-0.5"><Info size={14}/></button>{show&&<motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} className="absolute bottom-full right-0 mb-1 bg-gray-900 text-white text-xs rounded-xl px-3 py-2 w-48 z-20">AI-assisted response probability &gt;40%.</motion.div>}</div>);}
const TIER_COLORS:Record<string,string>={beginner:'bg-gray-100 text-gray-600',intermediate:'bg-blue-50 text-brand',advanced:'bg-purple-50 text-purple-700',expert:'bg-amber-50 text-amber-700'};
const DEGREE_LABELS:Record<string,string>={'1st':'bg-green-50 text-green-700 border-green-200','2nd':'bg-blue-50 text-brand border-blue-200','3rd':'bg-gray-50 text-gray-500 border-gray-200',none:'hidden'};
export default function CandidateCard({candidate,onSave}:{candidate:ICandidateCard;onSave?:(id:string)=>void}){
  const pipeline=useUpsertPipeline();const[saved,setSaved]=useState(false);
  const handleSave=async()=>{await pipeline.mutateAsync({candidateId:candidate.userId,status:'shortlisted'});setSaved(true);onSave?.(candidate.userId);};
  return(<motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
    <div className="flex items-start gap-3">
      <Link to={`/recruiter/candidates/${candidate.userId}`} className="shrink-0">
        {candidate.profilePhoto?<img src={candidate.profilePhoto} alt={candidate.fullName} className="w-12 h-12 rounded-full object-cover"/>:<div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center font-bold text-brand text-lg">{candidate.firstName[0]}</div>}
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/recruiter/candidates/${candidate.userId}`} className="font-semibold text-gray-900 hover:text-brand text-sm">{candidate.fullName}</Link>
          {candidate.connectionDegree!=='none'&&<span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${DEGREE_LABELS[candidate.connectionDegree]}`}>{candidate.connectionDegree}</span>}
          {candidate.openToWork&&<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Open to work</span>}
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">{candidate.headline}</p>
        {candidate.location.city&&<p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={10}/>{candidate.location.city}{candidate.location.country&&`, ${candidate.location.country}`}</p>}
      </div>
      {candidate.aiFlag&&<AIFlag/>}
    </div>
    {candidate.verifiedSkills.length>0&&<div className="flex flex-wrap gap-1.5">{candidate.verifiedSkills.map(skill=>(<div key={skill.skillId} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-blue-200 bg-blue-50"><ShieldCheck size={10} className="text-brand shrink-0"/><span className="font-medium text-gray-800">{skill.skillName}</span><span className={`px-1 rounded text-[10px] font-semibold capitalize ${TIER_COLORS[skill.tier]??''}`}>{skill.tier}</span><span className="text-gray-500">{skill.compositeScore}</span></div>))}</div>}
    <div className="flex items-center justify-between pt-1">
      <IntegrityBadge level={candidate.behaviorIntegrity}/>
      <div className="flex gap-1.5">
        <Link to={`/messages?new=${candidate.userId}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand" title="Message"><MessageSquare size={15}/></Link>
        <Link to={`/recruiter/candidates/${candidate.userId}`} className="text-xs font-medium text-brand hover:text-brand-dark px-2.5 py-1.5 rounded-lg hover:bg-blue-50">View</Link>
        <button onClick={handleSave} disabled={pipeline.isPending||saved} className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${saved?'bg-green-50 text-green-700':'bg-brand text-white hover:bg-brand-dark'}`}>{saved?<><CheckCircle2 size={12}/>Saved</>:<><UserPlus size={12}/>Save</>}</button>
      </div>
    </div>
  </motion.div>);
}
