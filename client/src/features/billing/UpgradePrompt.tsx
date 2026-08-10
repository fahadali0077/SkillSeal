import {Link} from 'react-router-dom';
import {motion} from 'framer-motion';
import {Zap,Lock,ArrowRight} from 'lucide-react';
interface Props{feature:string;description:string;requiredPlan?:'pro'|'recruiter';variant?:'card'|'inline'|'banner';className?:string;}
const PLAN_LABEL:Record<string,string>={pro:'Pro Candidate',recruiter:'Recruiter'};
export default function UpgradePrompt({feature,description,requiredPlan='pro',variant='card',className=''}:Props){
  const label=PLAN_LABEL[requiredPlan];
  if(variant==='banner')return(<motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} className={`flex items-center justify-between gap-4 px-5 py-3 bg-paper-sunk text-white rounded-xl ${className}`}><div className="flex items-center gap-3 min-w-0"><Zap size={18} className="shrink-0"/><p className="text-sm font-medium truncate"><span className="font-bold">{feature}</span> is available on {label}. {description}</p></div><Link to="/pricing" className="shrink-0 text-xs font-bold bg-white text-brand px-3 py-1.5 rounded-lg hover:bg-blue-50 flex items-center gap-1">Upgrade<ArrowRight size={12}/></Link></motion.div>);
  if(variant==='inline')return(<span className={`inline-flex items-center gap-1.5 text-xs text-gray-400 ${className}`}><Lock size={11}/>{feature} — available on <Link to="/pricing" className="text-brand hover:underline font-medium">{label}</Link></span>);
  return(<motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} className={`border border-dashed border-gray-200 rounded-2xl p-8 text-center ${className}`}>
    <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4"><Lock size={24} className="text-brand"/></div>
    <h3 className="font-bold text-gray-900 mb-1">{feature}</h3><p className="text-sm text-gray-500 max-w-xs mx-auto mb-5">{description}</p>
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3"><Link to="/pricing" className="flex items-center gap-2 bg-brand text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-dark text-sm"><Zap size={15}/>Upgrade to {label}</Link><Link to="/pricing" className="text-sm text-gray-400 hover:text-gray-600">See all plans →</Link></div>
  </motion.div>);
}
