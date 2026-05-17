import {Link} from 'react-router-dom';
import {motion} from 'framer-motion';
import {CreditCard,ShieldCheck,Calendar,CheckCircle2,XCircle,ExternalLink,Loader2,Zap,AlertTriangle} from 'lucide-react';
import {useBillingStatus,useManageSubscription} from './billingApi';
const FEATURES=[{key:'unlimitedVerifications' as const,label:'Unlimited skill verifications'},{key:'inmail' as const,label:'InMail messaging'},{key:'profileViews' as const,label:'Who viewed your profile'},{key:'profileBoost' as const,label:'Profile boost in recruiter search'},{key:'recruiterDashboard' as const,label:'Recruiter dashboard'},{key:'csvExport' as const,label:'CSV export'}];
const STATUS_BADGE:Record<string,{label:string;cls:string}>={active:{label:'Active',cls:'bg-green-50 text-green-700 border-green-200'},past_due:{label:'Payment due',cls:'bg-amber-50 text-amber-700 border-amber-200'},canceled:{label:'Canceled',cls:'bg-gray-100 text-gray-600 border-gray-200'},'':{label:'Free',cls:'bg-gray-100 text-gray-600 border-gray-200'}};
export default function BillingSettings(){
  const{data:billing,isLoading}=useBillingStatus();const portal=useManageSubscription();
  if(isLoading)return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-gray-300"/></div>;
  if(!billing)return null;
  const sb=STATUS_BADGE[billing.subscriptionStatus]??STATUS_BADGE[''];const isPaid=billing.accountType!=='free';
  return(<div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
    <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center"><CreditCard size={20} className="text-brand"/></div><h1 className="text-xl font-bold text-gray-900">Billing &amp; Subscription</h1></div>
    {billing.subscriptionStatus==='past_due'&&<motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl"><AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5"/><div><p className="font-semibold text-amber-800 text-sm">Payment failed</p><p className="text-amber-700 text-xs mt-0.5">Please update your payment method to keep your subscription active.</p></div></motion.div>}
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Current plan</p><div className="flex items-center gap-2"><h2 className="text-xl font-bold text-gray-900">{billing.planLabel}</h2><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${sb.cls}`}>{sb.label}</span></div>
          {billing.currentPeriodEnd&&<p className="text-sm text-gray-500 flex items-center gap-1.5 mt-2"><Calendar size={13}/>Next billing: {new Date(billing.currentPeriodEnd).toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'})}</p>}
          {billing.additionalCredits>0&&<p className="text-sm text-brand flex items-center gap-1.5 mt-1"><Zap size={13}/>{billing.additionalCredits} assessment credit{billing.additionalCredits!==1?'s':''} remaining</p>}
        </div>
        {/* BROKEN-01: Stripe integration is not yet wired — show a disabled
           coming-soon affordance instead of buttons that hit a 503. */}
        {isPaid?(<button disabled title="Subscription management launches soon" className="shrink-0 flex items-center gap-1.5 text-sm font-medium border border-gray-200 text-gray-400 px-4 py-2 rounded-xl cursor-not-allowed bg-gray-50"><ExternalLink size={14}/>Manage (coming soon)</button>):(<Link to="/pricing" className="shrink-0 flex items-center gap-1.5 text-sm font-semibold border border-amber-200 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl"><Zap size={14}/>Plans launching soon</Link>)}
      </div>
      <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-2 gap-2">
        {FEATURES.map(f=>{const enabled=billing.features[f.key];return(<div key={f.key} className={`flex items-center gap-2 text-sm ${enabled?'':'opacity-40'}`}>{enabled?<CheckCircle2 size={14} className="text-green-500 shrink-0"/>:<XCircle size={14} className="text-gray-300 shrink-0"/>}<span className={enabled?'text-gray-700':'text-gray-400'}>{f.label}</span></div>);})}
      </div>
    </div>
    {!isPaid&&<div className="card p-5"><h3 className="font-semibold text-gray-900 text-sm mb-1 flex items-center gap-2"><ShieldCheck size={15} className="text-brand"/>Need more verifications?</h3><p className="text-sm text-gray-500 mb-4">Free plan includes 2/year. Paid plans launch soon.</p><div className="flex gap-3"><button disabled className="btn-primary text-sm opacity-50 cursor-not-allowed">Upgrade (coming soon)</button><button disabled className="btn-secondary text-sm opacity-50 cursor-not-allowed">Buy credit (coming soon)</button></div></div>}
    {isPaid&&<p className="text-xs text-gray-400 text-center">Stripe customer portal launches soon — invoice access will be enabled then.</p>}
  </div>);
}
