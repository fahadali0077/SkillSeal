import {useState} from 'react';
import {Link} from 'react-router-dom';
import {motion,AnimatePresence} from 'framer-motion';
import {CheckCircle2,ShieldCheck,Zap,Building2,Loader2,Star} from 'lucide-react';
import {useStartCheckout,useBillingStatus,type PlanId} from './billingApi';
import {useSEO} from '../../lib/useSEO';
import {useIsAuthenticated} from '../auth/useAuth';
const PLANS=[
  {id:'free',name:'Free',icon:<ShieldCheck size={22}/>,monthlyPrice:0,yearlyPrice:0,yearlyTotal:0,accent:'text-gray-600',accentBg:'bg-gray-50 border-gray-200',monthlyPlanId:'pro_monthly' as PlanId,yearlyPlanId:'pro_yearly' as PlanId,
    features:[{text:'2 verifications/year',i:true},{text:'All social features',i:true},{text:'Job apply',i:true},{text:'Public verified profile',i:true},{text:'Unlimited verifications',i:false},{text:'Who viewed profile',i:false},{text:'InMail messaging',i:false},{text:'Profile boost',i:false}],cta:'Start for free'},
  {id:'pro',name:'Pro Candidate',icon:<Star size={22}/>,monthlyPrice:12,yearlyPrice:99,yearlyTotal:99,badge:'Most popular',accent:'text-brand',accentBg:'bg-blue-50 border-brand',monthlyPlanId:'pro_monthly' as PlanId,yearlyPlanId:'pro_yearly' as PlanId,
    features:[{text:'Unlimited verifications',i:true,h:true},{text:'All social features',i:true},{text:'Job apply',i:true},{text:'Who viewed profile',i:true,h:true},{text:'10 InMails/month',i:true,h:true},{text:'Profile boost',i:true,h:true},{text:'Shareable resume',i:true,h:true},{text:'Recruiter dashboard',i:false}],cta:'Start Pro'},
  {id:'recruiter',name:'Recruiter',icon:<Building2 size={22}/>,monthlyPrice:99,yearlyPrice:799,yearlyTotal:799,accent:'text-purple-600',accentBg:'bg-purple-50 border-purple-300',monthlyPlanId:'recruiter_monthly' as PlanId,yearlyPlanId:'recruiter_yearly' as PlanId,
    features:[{text:'Everything in Pro',i:true},{text:'Full recruiter dashboard',i:true,h:true},{text:'Unlimited InMail',i:true,h:true},{text:'Talent search & filters',i:true,h:true},{text:'Pipeline & audit trails',i:true,h:true},{text:'CSV export',i:true,h:true},{text:'5 team seats',i:true,h:true},{text:'Priority support',i:true}],cta:'Start Recruiting'},
] as const;
export default function PricingPage(){
  useSEO({title:'Pricing',description:'Simple, transparent pricing for SkillSeal. Verify candidate skills and hire proven talent. Plans for recruiters, teams, and enterprises.',keywords:'skill verification pricing, recruiter assessment tool pricing, hire verified candidates',canonical:'/pricing'});
  const[annual,setAnnual]=useState(true);const isAuth=useIsAuthenticated();const{data:billing}=useBillingStatus();const checkout=useStartCheckout();const cur=billing?.accountType??'free';
  return(<div className="max-w-6xl mx-auto px-4 py-12">
    <div className="text-center mb-10">
      <h1 className="text-4xl font-bold text-gray-900 mb-3">Verify your skills. Land better roles.</h1>
      <p className="text-gray-500 text-lg max-w-xl mx-auto">AI-powered assessments give recruiters proof — not promises.</p>
      <div className="mt-6 inline-flex items-center gap-3 bg-gray-100 rounded-xl p-1">
        <button onClick={()=>setAnnual(false)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!annual?'bg-white text-gray-900 shadow-sm':'text-gray-500'}`}>Monthly</button>
        <button onClick={()=>setAnnual(true)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${annual?'bg-white text-gray-900 shadow-sm':'text-gray-500'}`}>Annual<span className="text-[11px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-sm">Save up to 31%</span></button>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {PLANS.map((plan,pi)=>{
        const price=annual?Math.round(plan.yearlyTotal/12):plan.monthlyPrice;const isCurrent=cur===plan.id;const isHL=plan.id==='pro';const saving=plan.monthlyPrice>0?Math.round(((plan.monthlyPrice*12-plan.yearlyTotal)/(plan.monthlyPrice*12))*100):0;
        return(<motion.div key={plan.id} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:pi*0.07}} className={`relative rounded-2xl border overflow-hidden ${isHL?'border-brand shadow-xl scale-[1.02]':'border-gray-200 shadow-sm'}`}>
          {'badge' in plan&&plan.badge&&<div className="absolute top-0 left-0 right-0 bg-brand text-white text-xs font-bold py-1.5 text-center tracking-wide">{plan.badge}</div>}
          <div className={`p-6 ${'badge' in plan&&plan.badge?'pt-10':''}`}>
            <div className={`flex items-center gap-2 mb-1 ${plan.accent}`}>{plan.icon}<span className="font-bold text-lg">{plan.name}</span></div>
            <div className="mb-6">
              <div className="flex items-end gap-1.5 mt-2"><span className="text-4xl font-bold text-gray-900">{price===0?'Free':`$${price}`}</span>{price>0&&<span className="text-gray-500 text-sm mb-1">/month</span>}</div>
              <AnimatePresence mode="wait">{annual&&price>0?(<motion.p key="a" initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="text-xs text-gray-500 mt-1">${plan.yearlyTotal}/year annually{saving>0&&<span className="ml-1 text-green-600 font-semibold">(save {saving}%)</span>}</motion.p>):(<motion.p key="m" initial={{opacity:0}} animate={{opacity:1}} className="text-xs text-gray-400 mt-1">{price===0?'Always free':'Billed monthly'}</motion.p>)}</AnimatePresence>
            </div>
            {isCurrent?(<div className="w-full py-2.5 text-center rounded-xl text-sm font-semibold bg-green-50 text-green-700 border border-green-200 mb-6">✓ Current plan</div>):plan.id==='free'?(<Link to="/register" className="block w-full py-2.5 text-center rounded-xl text-sm font-semibold border border-gray-200 hover:border-brand text-gray-700 hover:text-brand mb-6 transition-colors">{plan.cta}</Link>):(
              /* BROKEN-01: Stripe checkout is not yet wired server-side; show
                 a disabled "Coming Soon" pill instead of a 503-bound button. */
              <button
                type="button"
                disabled
                title="Paid plans launch soon — your free plan is fully featured for now"
                className="w-full py-2.5 rounded-xl text-sm font-semibold mb-6 flex items-center justify-center gap-2 bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
              >
                <Zap size={15}/> Coming soon
              </button>
            )}
            <ul className="space-y-2.5">{plan.features.map((f,i)=>(<li key={i} className={`flex items-start gap-2.5 text-sm ${f.i?'':'opacity-40'}`}><CheckCircle2 size={15} className={`shrink-0 mt-0.5 ${'h' in f&&f.h?'text-brand':f.i?'text-green-500':'text-gray-300'}`}/><span className={`${'h' in f&&f.h&&f.i?'font-medium text-gray-900':'text-gray-600'}`}>{f.text}</span></li>))}</ul>
          </div>
        </motion.div>);
      })}
    </div>
    <div className="mt-10 p-5 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div><p className="font-semibold text-gray-900 text-sm">Need one more verification?</p><p className="text-sm text-gray-500 mt-0.5">Buy individual assessment credits for <strong>$5 each</strong>. <span className="text-amber-600">Coming soon.</span></p></div>
      <button disabled className="shrink-0 text-sm font-semibold text-gray-400 border border-gray-200 bg-gray-50 px-4 py-2 rounded-xl cursor-not-allowed">Coming soon</button>
    </div>
    <p className="text-center text-xs text-gray-400 mt-8">14-day money-back guarantee. Cancel anytime. Prices in USD.</p>
  </div>);
}
