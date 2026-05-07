import {useState} from 'react';
import {Search,Loader2,Users} from 'lucide-react';
import {motion,AnimatePresence} from 'framer-motion';
import CandidateCard from './CandidateCard';
import {useCandidateSearch,type TalentSearchParams} from './recruiterApi';
const SKILLS=['React','Node.js','MongoDB','TypeScript','Python','AWS'];
const TIERS=['beginner','intermediate','advanced','expert'];
const SORTS=[{value:'score' as const,label:'By Score'},{value:'date' as const,label:'Date Verified'},{value:'active' as const,label:'Recently Active'}];
export default function TalentSearch(){
  const[params,setParams]=useState<TalentSearchParams>({sort:'score',page:1});const[keyword,setKeyword]=useState('');
  const{data,isLoading,isFetching}=useCandidateSearch(params,true);
  const candidates=data?.candidates??[];const total=data?.total??0;
  const set=(patch:Partial<TalentSearchParams>)=>setParams(p=>({...p,...patch,page:1}));
  return(<div className="space-y-5">
    <div className="card p-4 space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={keyword} onChange={e=>setKeyword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&set({skill:keyword||undefined})} placeholder="Search by skill…" className="input pl-9 text-sm w-full"/></div>
        <input placeholder="Location" onChange={e=>set({location:e.target.value||undefined})} className="input text-sm w-40"/>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select className="input text-sm py-1.5" onChange={e=>set({skill:e.target.value||undefined})}><option value="">All skills</option>{SKILLS.map(s=><option key={s} value={s.toLowerCase().replace('.','').replace(' ','-')}>{s}</option>)}</select>
        <select className="input text-sm py-1.5" onChange={e=>set({tier:e.target.value as TalentSearchParams['tier']||undefined})}><option value="">All tiers</option>{TIERS.map(t=><option key={t} value={t} className="capitalize">{t}</option>)}</select>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer"><input type="checkbox" className="accent-brand" onChange={e=>set({verifiedOnly:e.target.checked||undefined})}/>Verified only</label>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer"><input type="checkbox" className="accent-brand" onChange={e=>set({openToWork:e.target.checked||undefined})}/>Open to work</label>
        <div className="flex gap-1 ml-auto">{SORTS.map(s=>(<button key={s.value} onClick={()=>set({sort:s.value})} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${params.sort===s.value?'bg-brand text-white':'text-gray-500 hover:bg-gray-100'}`}>{s.label}</button>))}</div>
      </div>
    </div>
    <div className="flex items-center justify-between"><p className="text-sm text-gray-500">{isLoading?'Searching…':`${total} candidate${total!==1?'s':''} found`}{isFetching&&!isLoading&&<Loader2 size={12} className="inline ml-2 animate-spin"/>}</p></div>
    {isLoading?(<div className="flex justify-center py-12 text-gray-300"><Loader2 size={28} className="animate-spin"/></div>):candidates.length===0?(<div className="card p-10 text-center text-gray-400"><Users size={40} className="mx-auto mb-3 opacity-30"/><p className="font-medium text-gray-600">No candidates match your filters.</p></div>):(<AnimatePresence initial={false}><div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{candidates.map((c,i)=>(<motion.div key={c.userId} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*0.04,0.3)}}><CandidateCard candidate={c}/></motion.div>))}</div></AnimatePresence>)}
    {total>20&&<div className="flex justify-center gap-3"><button onClick={()=>setParams(p=>({...p,page:Math.max(1,(p.page??1)-1)}))} disabled={params.page===1} className="btn-secondary text-sm disabled:opacity-40">← Prev</button><span className="text-sm text-gray-500 self-center">Page {params.page}</span><button onClick={()=>setParams(p=>({...p,page:(p.page??1)+1}))} disabled={(params.page??1)*20>=total} className="btn-secondary text-sm disabled:opacity-40">Next →</button></div>}
  </div>);
}
