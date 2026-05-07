import { Router, Response } from 'express';
import { ApiErrorCode } from '@SkillSeal/shared';
import { authenticate, optionalAuth, requireRole, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import { createCompany, getCompany, updateCompany, followCompany, unfollowCompany, getEmployees, getCompanyJobs, listCompanies } from '../services/companies.service';
const router = Router();
function handle(err: unknown, res: Response) { if (err instanceof AppError) sendError(res, err.message, err.statusCode, err.statusCode === 403 ? ApiErrorCode.FORBIDDEN : err.statusCode === 404 ? ApiErrorCode.NOT_FOUND : ApiErrorCode.INTERNAL_ERROR); else sendError(res, 'Error', 500, ApiErrorCode.INTERNAL_ERROR); }
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => { try { const page = parseInt(req.query['page'] as string ?? '1', 10); sendSuccess(res, await listCompanies(page), 'Companies retrieved'); } catch (err) { handle(err, res); } });
router.post('/', authenticate, requireRole('company_admin', 'platform_admin'), async (req: AuthRequest, res: Response) => { try { const c = await createCompany(req.user!.userId, req.body as Record<string, unknown>); sendSuccess(res, c, 'Created', 201); } catch (err) { handle(err, res); } });
router.get('/:slug', optionalAuth, async (req: AuthRequest, res: Response) => { try { sendSuccess(res, await getCompany(req.params['slug']!), 'Company'); } catch (err) { handle(err, res); } });
router.put('/:slug', authenticate, async (req: AuthRequest, res: Response) => { try { sendSuccess(res, await updateCompany(req.params['slug']!, req.user!.userId, req.body as Record<string, unknown>), 'Updated'); } catch (err) { handle(err, res); } });
router.post('/:slug/follow', authenticate, async (req: AuthRequest, res: Response) => { try { await followCompany(req.params['slug']!, req.user!.userId); sendSuccess(res, null, 'Following'); } catch (err) { handle(err, res); } });
router.delete('/:slug/follow', authenticate, async (req: AuthRequest, res: Response) => { try { await unfollowCompany(req.params['slug']!, req.user!.userId); sendSuccess(res, null, 'Unfollowed'); } catch (err) { handle(err, res); } });
router.get('/:slug/employees', optionalAuth, async (req: AuthRequest, res: Response) => { try { const r = await getEmployees(req.params['slug']!, parseInt(req.query['page'] as string ?? '1', 10)); sendSuccess(res, r, 'Employees'); } catch (err) { handle(err, res); } });
router.get('/:slug/jobs', optionalAuth, async (req: AuthRequest, res: Response) => { try { const r = await getCompanyJobs(req.params['slug']!, parseInt(req.query['page'] as string ?? '1', 10)); sendSuccess(res, r, 'Jobs'); } catch (err) { handle(err, res); } });
export default router;
