import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_ORIGIN } from '../../lib/apiBase';
const BASE = `${API_ORIGIN}/api/v1/billing`;
async function apiFetch<T>(url:string,init:RequestInit={}):Promise<T>{
  const res=await fetch(url,{headers:{'Content-Type':'application/json'},credentials:'include',...init});
  const json=await res.json() as{success:boolean;data:T;message:string};
  if(!json.success)throw new Error((json as unknown as{message:string}).message);
  return json.data;
}
export type PlanId='pro_monthly'|'pro_yearly'|'recruiter_monthly'|'recruiter_yearly';
export interface BillingStatus{accountType:'free'|'pro'|'recruiter';planLabel:string;subscriptionStatus:string;currentPeriodEnd:string|null;additionalCredits:number;features:{unlimitedVerifications:boolean;inmail:boolean;recruiterDashboard:boolean;profileViews:boolean;profileBoost:boolean;csvExport:boolean;}}
export const billingApi={
  getStatus:()=>apiFetch<BillingStatus>(`${BASE}/status`),
  createCheckout:(planId:PlanId)=>apiFetch<{checkoutUrl:string}>(`${BASE}/create-checkout-session`,{method:'POST',body:JSON.stringify({planId})}),
  createPortal:()=>apiFetch<{portalUrl:string}>(`${BASE}/portal`),
  buyAssessmentCredit:(quantity=1)=>apiFetch<{clientSecret:string}>(`${BASE}/buy-assessment`,{method:'POST',body:JSON.stringify({quantity})}),
};
const BILLING_KEY=['billing','status'] as const;
export function useBillingStatus(){return useQuery({queryKey:BILLING_KEY,queryFn:billingApi.getStatus,staleTime:5*60_000,retry:1});}
export function useStartCheckout(){return useMutation({mutationFn:(planId:PlanId)=>billingApi.createCheckout(planId),onSuccess:({checkoutUrl})=>{window.location.href=checkoutUrl;}});}
export function useManageSubscription(){return useMutation({mutationFn:billingApi.createPortal,onSuccess:({portalUrl})=>{window.location.href=portalUrl;}});}
export function useBuyAssessmentCredit(){const qc=useQueryClient();return useMutation({mutationFn:(qty:number)=>billingApi.buyAssessmentCredit(qty),onSuccess:()=>qc.invalidateQueries({queryKey:BILLING_KEY})});}
