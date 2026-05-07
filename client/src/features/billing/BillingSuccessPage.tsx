import {useEffect} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {motion} from 'framer-motion';
import {ShieldCheck,CheckCircle2,ArrowRight,Star,Infinity,Eye,MessageSquare,Zap} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {useBillingStatus} from './billingApi';
const PRO_UNLOCKS=[{icon:<Infinity size={16}/>,label:'Unlimited skill verifications'},{icon:<Eye size={16}/>,label:'See who viewed your profile'},{icon:<MessageSquare size={16}/>,label:'10 InMail messages per month'},{icon:<Zap size={16}/>,label:'Profile boost in recruiter search'}];
const REC_UNLOCKS=[{icon:<ShieldCheck size={16}/>,label:'Full recruiter dashboard'},{icon:<Star size={16}/>,label:'Unlimited talent search & InMail'},{icon:<Zap size={16}/>,label:'Pipeline, audit trails, CSV export'},{icon:<CheckCircle2 size={16}/>,label:'5 team seats included'}];
export default function BillingSuccessPage(){
  const[params]=useSearchParams();const qc=useQueryClient();const{data:billing,refetch}=useBillingStatus();
  useEffect(()=>{const t=setTimeout(()=>{void qc.invalidateQueries({queryKey:['billing','status']});void refetch();},1500);return()=>clearTimeout(t);},[]);
  const isRec=billing?.accountType==='recruiter';const unlocks=isRec?REC_UNLOCKS:PRO_UNLOCKS;const planLabel=billing?.planLabel??'Pro';
  return(<div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4 py-12">
    <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{type:'spring',damping:22}} className="max-w-md w-full text-center space-y-6">
      <motion.div initial={{scale:0.5}} animate={{scale:1}} transition={{type:'spring',delay:0.1,stiffness:200}} className="w-24 h-24 rounded-full bg-brand/10 border-4 border-brand/30 flex items-center justify-center mx-auto"><CheckCircle2 size={44} className="text-brand"/></motion.div>
      <div><h1 className="text-3xl font-bold text-gray-900">Welcome to {planLabel}! 🎉</h1><p className="text-gray-500 mt-2">Your subscription is active. Here's what you've unlocked:</p></div>
      <div className="bg-white border border-blue-100 rounded-2xl p-5 text-left shadow-sm">
        <ul className="space-y-3">{unlocks.map((item,i)=>(<motion.li key={i} initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} transition={{delay:0.2+i*0.08}} className="flex items-center gap-3 text-sm font-medium text-gray-800"><div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand shrink-0">{item.icon}</div>{item.label}</motion.li>))}</ul>
      </div>
      <div className="flex flex-col gap-3">
        <Link to="/assessment" className="flex items-center justify-center gap-2 bg-brand text-white font-semibold px-6 py-3 rounded-xl hover:bg-brand-dark"><ShieldCheck size={16}/>Verify a skill now</Link>
        <Link to="/feed" className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 py-2">Go to feed <ArrowRight size={14}/></Link>
      </div>
      <p className="text-xs text-gray-400">Manage subscription in <Link to="/billing" className="text-brand hover:underline">Billing settings</Link>.</p>
    </motion.div>
  </div>);
}
