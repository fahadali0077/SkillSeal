import {useState} from 'react';
import {motion,AnimatePresence} from 'framer-motion';
import {Users,Columns,Bookmark,ClipboardList,Briefcase} from 'lucide-react';
import TalentSearch from './TalentSearch';
import PipelineView from './PipelineView';
type Tab='search'|'pipeline'|'saved'|'audit';
const TABS=[{id:'search' as Tab,label:'Talent Search',icon:<Users size={16}/>},{id:'pipeline' as Tab,label:'My Pipeline',icon:<Columns size={16}/>},{id:'saved' as Tab,label:'Saved Searches',icon:<Bookmark size={16}/>},{id:'audit' as Tab,label:'Assessment Audit',icon:<ClipboardList size={16}/>}];
export default function RecruiterDashboard(){
  const[tab,setTab]=useState<Tab>('search');
  return(<div className="max-w-7xl mx-auto px-4 py-6">
    <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center"><Briefcase size={20} className="text-brand"/></div><div><h1 className="text-xl font-bold text-gray-900">Recruiter Dashboard</h1><p className="text-sm text-gray-500">Find verified talent and manage your pipeline</p></div></div>
    <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
      {TABS.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab===t.id?'border-brand text-brand':'border-transparent text-gray-500 hover:text-gray-700'}`}>{t.icon}{t.label}</button>))}
    </div>
    <AnimatePresence mode="wait">
      <motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.18}}>
        {tab==='search'&&<TalentSearch/>}
        {tab==='pipeline'&&<PipelineView/>}
        {tab==='saved'&&<div className="card p-10 text-center text-gray-400"><Bookmark size={36} className="mx-auto mb-3 opacity-30"/><p className="font-medium text-gray-600">Saved Searches</p><p className="text-sm mt-1">Save frequent search filters. Coming soon.</p></div>}
        {tab==='audit'&&<div className="card p-10 text-center text-gray-400"><ClipboardList size={36} className="mx-auto mb-3 opacity-30"/><p className="font-medium text-gray-600">Assessment Audit</p><p className="text-sm mt-1">View audit trails via candidate profile → verification history → View audit trail.</p></div>}
      </motion.div>
    </AnimatePresence>
  </div>);
}
