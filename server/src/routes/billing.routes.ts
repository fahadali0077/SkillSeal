import { Router, type Request, type Response, type NextFunction } from 'express';
import express from 'express';
import { ApiErrorCode } from '@SkillSeal/shared';
import { authenticate, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import { createCheckoutSession, createPortalSession, getBillingStatus, buyAssessmentCredit, handleWebhook, type PlanId } from '../services/billing.service';
const router = Router();
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') { res.status(400).json({ success: false, message: 'Missing stripe-signature' }); return; }
  try { await handleWebhook(req.body as Buffer, sig); res.json({ received: true }); }
  catch (err) { res.status(400).json({ success: false, message: err instanceof Error ? err.message : 'Webhook failed' }); }
});
router.use(authenticate);
router.post('/create-checkout-session', async (req: AuthRequest, res: Response) => { try { const { planId } = req.body as { planId?: PlanId }; if (!planId) { sendError(res, 'planId required.', 400, ApiErrorCode.VALIDATION_ERROR); return; } sendSuccess(res, await createCheckoutSession(req.user!.userId, planId), 'Checkout created'); } catch (err) { if (err instanceof AppError) sendError(res, err.message, err.statusCode, ApiErrorCode.INTERNAL_ERROR); else sendError(res, 'Error', 500, ApiErrorCode.INTERNAL_ERROR); } });
router.get('/portal', async (req: AuthRequest, res: Response) => { try { sendSuccess(res, await createPortalSession(req.user!.userId), 'Portal'); } catch (err) { if (err instanceof AppError) sendError(res, err.message, err.statusCode, ApiErrorCode.INTERNAL_ERROR); else sendError(res, 'Error', 500, ApiErrorCode.INTERNAL_ERROR); } });
router.get('/status', async (req: AuthRequest, res: Response) => { try { sendSuccess(res, await getBillingStatus(req.user!.userId), 'Status'); } catch (err) { sendError(res, 'Error', 500, ApiErrorCode.INTERNAL_ERROR); } });
router.post('/buy-assessment', async (req: AuthRequest, res: Response) => { try { const { quantity = 1 } = req.body as { quantity?: number }; sendSuccess(res, await buyAssessmentCredit(req.user!.userId, quantity), 'PaymentIntent created'); } catch (err) { if (err instanceof AppError) sendError(res, err.message, err.statusCode, ApiErrorCode.INTERNAL_ERROR); else sendError(res, 'Error', 500, ApiErrorCode.INTERNAL_ERROR); } });
export default router;
