// billing.service.ts
// Stripe-dependent functions are guarded — Stripe is optional (currently disabled).
// Safe functions: checkVerificationLimit, getBillingStatus, buildBillingStatus.
// Stripe functions throw a 503 if STRIPE_SECRET_KEY is not configured.

import { Types } from 'mongoose';
import { User } from '../models/User.model';
import type { IUserDocument } from '../models/User.model';
import { Verification } from '../models/Verification.model';
import { AppError } from '../middleware/error.middleware';
import logger from '../utils/logger';

// ── Stripe type stubs (only used when Stripe is active) ───────────────────────
type StripeInstance = {
  checkout: { sessions: { create: Function } };
  customers: { create: Function };
  webhooks: { constructEvent: Function };
  subscriptions: { retrieve: Function };
  billingPortal: { sessions: { create: Function } };
  paymentIntents: { create: Function };
};

let stripeClient: StripeInstance | null = null;

function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): StripeInstance {
  if (!isStripeConfigured()) {
    throw new AppError('Billing is not enabled on this deployment.', 503, true);
  }
  if (!stripeClient) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const StripeLib = require('stripe') as { new(key: string, opts?: object): StripeInstance };
    stripeClient = new StripeLib(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeClient;
}

export type PlanId = 'pro_monthly' | 'pro_yearly' | 'recruiter_monthly' | 'recruiter_yearly';

// Lazy — evaluated on first call, not at module load
function getPlanPriceMap(): Record<PlanId, string> {
  return {
    pro_monthly:        process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? '',
    pro_yearly:         process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? '',
    recruiter_monthly:  process.env.STRIPE_RECRUITER_MONTHLY_PRICE_ID ?? '',
    recruiter_yearly:   process.env.STRIPE_RECRUITER_YEARLY_PRICE_ID ?? '',
  };
}

const PLAN_ACCOUNT_TYPE: Record<PlanId, 'pro' | 'recruiter'> = {
  pro_monthly: 'pro', pro_yearly: 'pro',
  recruiter_monthly: 'recruiter', recruiter_yearly: 'recruiter',
};

// ── Billing status (no Stripe required) ───────────────────────────────────────

export interface BillingStatus {
  accountType: 'free' | 'pro' | 'recruiter';
  planLabel: string;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  additionalCredits: number;
  features: {
    unlimitedVerifications: boolean;
    inmail: boolean;
    recruiterDashboard: boolean;
    profileViews: boolean;
    profileBoost: boolean;
    csvExport: boolean;
  };
}

export function buildBillingStatus(user: IUserDocument): BillingStatus {
  const at = user.accountType;
  return {
    accountType: at,
    planLabel: at === 'pro' ? 'Pro Candidate' : at === 'recruiter' ? 'Recruiter' : 'Free',
    subscriptionStatus: user.subscriptionStatus ?? '',
    currentPeriodEnd: user.currentPeriodEnd ? new Date(user.currentPeriodEnd).toISOString() : null,
    additionalCredits: user.additionalAssessmentCredits ?? 0,
    features: {
      unlimitedVerifications: at !== 'free',
      inmail: at !== 'free',
      recruiterDashboard: at === 'recruiter',
      profileViews: at !== 'free',
      profileBoost: at !== 'free',
      csvExport: at === 'recruiter',
    },
  };
}

export async function getBillingStatus(userId: string): Promise<BillingStatus> {
  const user = await User.findById(userId).lean<IUserDocument>();
  if (!user) throw new AppError('User not found.', 404, true);
  return buildBillingStatus(user);
}

// ── Verification limit check (no Stripe required) ─────────────────────────────

export async function checkVerificationLimit(userId: string): Promise<void> {
  const user = await User.findById(userId).lean<IUserDocument>();
  if (!user) throw new AppError('User not found.', 404, true);
  if (user.accountType !== 'free') return;

  const since = new Date(Date.now() - 365 * 24 * 3600000);
  const count = await Verification.countDocuments({
    userId: new Types.ObjectId(userId),
    issuedAt: { $gte: since },
    status: { $in: ['VERIFIED', 'FLAGGED'] },
  });

  if (count >= 2) {
    if ((user.additionalAssessmentCredits ?? 0) > 0) {
      await User.findByIdAndUpdate(userId, { $inc: { additionalAssessmentCredits: -1 } });
      return;
    }
    throw Object.assign(
      new AppError('Verification limit reached. Upgrade to Pro.', 403, true),
      { code: 'VERIFICATION_LIMIT_REACHED', upgradeUrl: '/pricing' }
    );
  }
}

// ── Stripe-dependent functions (require STRIPE_SECRET_KEY) ────────────────────

async function getOrCreateStripeCustomer(user: IUserDocument): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const c = await getStripe().customers.create({
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    metadata: { userId: user._id.toString() },
  });
  await User.findByIdAndUpdate(user._id, { stripeCustomerId: c.id });
  return c.id;
}

export async function createCheckoutSession(userId: string, planId: PlanId) {
  const user = await User.findById(userId).lean<IUserDocument>();
  if (!user) throw new AppError('User not found.', 404, true);
  const priceId = getPlanPriceMap()[planId];
  if (!priceId) throw new AppError(`Unknown plan: ${planId}`, 400, true);
  const customerId = await getOrCreateStripeCustomer(user);
  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.CLIENT_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/pricing`,
    metadata: { userId, planId },
    allow_promotion_codes: true,
  });
  if (!session.url) throw new AppError('Checkout session failed.', 500, true);
  return { checkoutUrl: session.url };
}

export async function handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
  const stripe = getStripe();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    throw new AppError(`Webhook error: ${err instanceof Error ? err.message : 'invalid'}`, 400, true);
  }

  const PLAN_PRICE_MAP = getPlanPriceMap();

  switch (event.type) {
    case 'checkout.session.completed': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = event.data.object as any;
      const userId = s.metadata?.['userId'];
      const planId = s.metadata?.['planId'] as PlanId | undefined;
      if (!userId || !planId) break;
      const existing = await User.findOne({
        _id: new Types.ObjectId(userId),
        stripeSubscriptionId: s.subscription as string,
      }).lean();
      if (existing) break;
      const at = PLAN_ACCOUNT_TYPE[planId];
      const sub = s.subscription ? await stripe.subscriptions.retrieve(s.subscription as string) : null;
      await User.findByIdAndUpdate(userId, {
        accountType: at,
        stripeCustomerId: s.customer as string,
        stripeSubscriptionId: s.subscription as string ?? '',
        subscriptionStatus: sub?.status ?? 'active',
        currentPeriodEnd: sub?.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      });
      break;
    }
    case 'customer.subscription.deleted': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = event.data.object as any;
      const userId = sub.metadata?.['userId'];
      if (!userId) break;
      await User.findByIdAndUpdate(userId, {
        accountType: 'free', subscriptionStatus: 'canceled',
        stripeSubscriptionId: '', currentPeriodEnd: null,
      });
      break;
    }
    case 'customer.subscription.updated': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = event.data.object as any;
      const userId = sub.metadata?.['userId'];
      if (!userId) break;
      const priceId = sub.items.data[0]?.price?.id;
      let at: 'free' | 'pro' | 'recruiter' = 'free';
      for (const [plan, pid] of Object.entries(PLAN_PRICE_MAP)) {
        if (pid === priceId) { at = PLAN_ACCOUNT_TYPE[plan as PlanId]; break; }
      }
      await User.findByIdAndUpdate(userId, {
        accountType: at, subscriptionStatus: sub.status,
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
      });
      break;
    }
    case 'invoice.payment_failed': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inv = event.data.object as any;
      const u = await User.findOne({ stripeCustomerId: inv.customer as string }).lean<IUserDocument>();
      if (u) {
        await User.findByIdAndUpdate(u._id, { subscriptionStatus: 'past_due' });
        logger.warn('payment_failed notification:', { userId: u._id.toString(), firstName: u.firstName });
      }
      break;
    }
  }
}

export async function createPortalSession(userId: string) {
  const user = await User.findById(userId).lean<IUserDocument>();
  if (!user) throw new AppError('User not found.', 404, true);
  if (!user.stripeCustomerId) throw new AppError('No billing account found.', 400, true);
  const s = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.CLIENT_URL}/billing`,
  });
  return { portalUrl: s.url };
}

export async function buyAssessmentCredit(userId: string, quantity = 1) {
  const user = await User.findById(userId).lean<IUserDocument>();
  if (!user) throw new AppError('User not found.', 404, true);
  const customerId = await getOrCreateStripeCustomer(user);
  const intent = await getStripe().paymentIntents.create({
    amount: quantity * 500,
    currency: 'usd',
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    metadata: { userId, type: 'assessment_credit', quantity: String(quantity) },
  });
  return { clientSecret: intent.client_secret! };
}

export async function grantAssessmentCredits(userId: string, quantity: number): Promise<void> {
  await User.findByIdAndUpdate(userId, { $inc: { additionalAssessmentCredits: quantity } });
}
