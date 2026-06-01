import { Router, Response } from 'express';
import { ApiErrorCode } from '@SkillSeal/shared';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import { searchCandidates, getCandidateView, getSessionAudit, upsertPipeline, getPipelineGrouped, exportCandidatesCsv } from '../services/recruiter.service';
const router = Router(); router.use(authenticate, requireRole('recruiter', 'company_admin', 'platform_admin'));
function handle(err: unknown, res: Response) { if (err instanceof AppError) sendError(res, err.message, err.statusCode, err.statusCode === 403 ? ApiErrorCode.FORBIDDEN : err.statusCode === 404 ? ApiErrorCode.NOT_FOUND : ApiErrorCode.INTERNAL_ERROR); else sendError(res, 'Error', 500, ApiErrorCode.INTERNAL_ERROR); }
router.get('/candidates', async (req: AuthRequest, res: Response) => { try { const r = await searchCandidates(req.user!.userId, { ...req.query, page: parseInt(req.query['page'] as string ?? '1', 10), limit: Math.min(parseInt(req.query['limit'] as string ?? '20', 10), 50), verifiedOnly: req.query['verifiedOnly'] === 'true', openToWork: req.query['openToWork'] === 'true' }); sendSuccess(res, r, 'Candidates'); } catch (err) { handle(err, res); } });
router.get('/candidates/:userId', async (req: AuthRequest, res: Response) => { try { sendSuccess(res, await getCandidateView(req.params['userId']!, req.user!.userId), 'Candidate'); } catch (err) { handle(err, res); } });
router.get('/sessions/:sessionId', async (req: AuthRequest, res: Response) => { try { sendSuccess(res, await getSessionAudit(req.params['sessionId']!, req.user!.userId), 'Audit'); } catch (err) { handle(err, res); } });
router.post('/pipeline', async (req: AuthRequest, res: Response) => { try { const { candidateId, jobId, status, note } = req.body as { candidateId?: string; jobId?: string; status?: string; note?: string }; if (!candidateId || !status) { sendError(res, 'candidateId and status required.', 400, ApiErrorCode.VALIDATION_ERROR); return; } const r = await upsertPipeline(req.user!.userId, { candidateId, jobId, status, note }); sendSuccess(res, r, 'Pipeline updated'); } catch (err) { handle(err, res); } });
router.get('/pipeline', async (req: AuthRequest, res: Response) => { try { sendSuccess(res, await getPipelineGrouped(req.user!.userId, req.query['jobId'] as string), 'Pipeline'); } catch (err) { handle(err, res); } });
router.get('/export', async (req: AuthRequest, res: Response) => { try { const csv = await exportCandidatesCsv(req.user!.userId, { jobId: req.query['jobId'] as string, skillId: req.query['skillId'] as string, tier: req.query['tier'] as string }); res.setHeader('Content-Type', 'text/csv').setHeader('Content-Disposition', 'attachment; filename="SkillSeal-candidates.csv"').send(csv); } catch (err) { handle(err, res); } });
export default router;
