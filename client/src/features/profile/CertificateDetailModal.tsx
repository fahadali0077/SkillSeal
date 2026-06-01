import {useState} from 'react';
import {Link} from 'react-router-dom';
import {motion,AnimatePresence} from 'framer-motion';
import {X,ShieldCheck,Copy,CheckCheck,ExternalLink,Share2,Calendar,Award} from 'lucide-react';
interface VerifDetail{skillId:string;skillName:string;tier:string;compositeScore:number;verificationId:string;certificateId:string;issuedAt:string;expiresAt:string;status:string;}
interface Props{skill:VerifDetail;isOwner:boolean;onClose:()=>void;}
const TIER_COLORS:Record<string,string>={beginner:'from-gray-400 to-gray-500',intermediate:'from-blue-400 to-blue-600',advanced:'from-purple-400 to-purple-600',expert:'from-amber-400 to-orange-500'};
const TIER_LABELS:Record<string,string>={beginner:'Beginner',intermediate:'Mid Level',advanced:'Advanced',expert:'Expert'};
export default function CertificateDetailModal({skill,isOwner,onClose}:Props){
  const[idCopied,setIdCopied]=useState(false);const[urlCopied,setUrlCopied]=useState(false);
  const publicUrl=`${window.location.origin}/verify/${skill.verificationId}`;
  const liUrl=`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`;
  const isExpired=skill.status==='EXPIRED'||new Date(skill.expiresAt)<new Date();
  const scoreColor=skill.compositeScore>=70?'#22c55e':skill.compositeScore>=50?'#f59e0b':'#ef4444';
  const copyId=()=>navigator.clipboard.writeText(skill.certificateId).then(()=>{setIdCopied(true);setTimeout(()=>setIdCopied(false),2000);});
  const copyUrl=()=>navigator.clipboard.writeText(publicUrl).then(()=>{setUrlCopied(true);setTimeout(()=>setUrlCopied(false),2000);});
  return(<AnimatePresence><motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <motion.div initial={{y:24,opacity:0,scale:0.97}} animate={{y:0,opacity:1,scale:1}} exit={{y:24,opacity:0,scale:0.97}} transition={{type:'spring',damping:24,stiffness:300}} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
      <div className={`bg-gradient-to-r ${TIER_COLORS[skill.tier]??TIER_COLORS.beginner} p-6 relative shrink-0`}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white"><X size={16}/></button>
        <div className="flex items-center gap-3"><div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0"><ShieldCheck size={28} className="text-white"/></div><div className="min-w-0"><p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Verified Certificate</p><h2 className="text-white text-xl font-bold break-words">{skill.skillName}</h2><p className="text-white/80 text-sm capitalize">{TIER_LABELS[skill.tier]??skill.tier} Level</p></div></div>
      </div>
      <div className="p-6 space-y-5 overflow-y-auto min-h-0">
        {isOwner&&skill.compositeScore>0&&(<div><p className="text-xs text-gray-500 mb-2">Your composite score</p><div className="flex items-center gap-3"><span className="text-3xl font-bold tabular-nums" style={{color:scoreColor}}>{skill.compositeScore}</span><span className="text-gray-400 text-sm">/100</span><div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${skill.compositeScore}%`,background:scoreColor}}/></div></div></div>)}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3"><div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><Calendar size={11}/>Issued</div><p className="text-sm font-semibold text-gray-800">{new Date(skill.issuedAt).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}</p></div>
          <div className={`rounded-xl p-3 ${isExpired?'bg-red-50':'bg-gray-50'}`}><div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><Award size={11}/>{isExpired?'Expired':'Valid until'}</div><p className={`text-sm font-semibold ${isExpired?'text-red-600':'text-gray-800'}`}>{new Date(skill.expiresAt).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}</p></div>
        </div>
        {isExpired&&isOwner&&<Link to={`/assessment?skillId=${skill.skillId}&tier=${skill.tier}`} onClick={onClose} className="flex items-center justify-center gap-2 bg-brand text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-dark text-sm"><ShieldCheck size={15}/>Re-verify Now</Link>}
        {skill.certificateId&&<div><p className="text-xs text-gray-400 mb-1">Certificate ID</p><div className="flex items-center gap-2"><code className="flex-1 font-mono text-sm text-gray-700 tracking-widest bg-gray-50 rounded-lg px-2 py-1.5">{skill.certificateId}</code><button onClick={copyId} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">{idCopied?<CheckCheck size={14} className="text-green-500"/>:<Copy size={14}/>}</button></div></div>}
        <div className="flex gap-2 pt-1">
          <button onClick={copyUrl} className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium border border-gray-200 hover:border-brand text-gray-600 hover:text-brand py-2 rounded-xl">{urlCopied?<><CheckCheck size={14} className="text-green-500"/>Copied!</>:<><Share2 size={14}/>Copy link</>}</button>
          <a href={liUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium bg-[#0a66c2] hover:bg-[#004182] text-white py-2 rounded-xl"><ExternalLink size={14}/>LinkedIn</a>
          <Link to={`/verify/${skill.verificationId}`} target="_blank" className="px-3 flex items-center justify-center text-gray-400 hover:text-brand border border-gray-200 rounded-xl hover:border-brand"><ExternalLink size={14}/></Link>
        </div>
      </div>
    </motion.div>
  </motion.div></AnimatePresence>);
}
