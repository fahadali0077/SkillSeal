// ─────────────────────────────────────────────────────────────────────────────
// jobs.routes.ts  –  /api/v1/jobs  +  /api/v1/applications  +  /api/v1/recruiter
// ─────────────────────────────────────────────────────────────────────────────
import { Router, Response } from 'express';
import { ApiErrorCode } from '@SkillSeal/shared';
import { authenticate, optionalAuth, requireRole, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import type { AppStatus } from '../models/Application.model';
import {
  searchJobs, getJob, createJob, updateJob,
  applyToJob, getMyApplications, getJobApplications,
  updateApplicationStatus, getJobPipeline,
} from '../services/jobs.service';
import { notifyJobMatch } from '../services/jobMatch.service';

const jobsRouter = Router();
const applicationsRouter = Router();
const recruiterRouter = Router();

function handle(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    const code = err.statusCode === 403 ? ApiErrorCode.FORBIDDEN
      : err.statusCode === 404 ? ApiErrorCode.NOT_FOUND
        : err.statusCode === 409 ? ApiErrorCode.ALREADY_EXISTS
          : err.statusCode === 400 ? ApiErrorCode.VALIDATION_ERROR
            : ApiErrorCode.INTERNAL_ERROR;
    sendError(res, err.message, err.statusCode, code);
  } else {
    sendError(res, 'Unexpected error', 500, ApiErrorCode.INTERNAL_ERROR);
  }
}

// ── Jobs router ───────────────────────────────────────────────────────────────

// GET /jobs
jobsRouter.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { keyword, skill, tier, location, workType, employmentType, sort, datePosted, page, limit } = req.query as Record<string, string>;
    const result = await searchJobs({
      keyword, skill, tier, location, workType, employmentType,
      sort: sort as 'relevant' | 'recent' | 'salary',
      datePosted: datePosted as 'any' | 'week' | 'month',
      verifiedOnly: req.query['verifiedOnly'] === 'true',
      salaryMin: req.query['salaryMin'] ? parseInt(req.query['salaryMin'] as string, 10) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    }, req.user?.userId);
    sendSuccess(res, result, 'Jobs retrieved');
  } catch (err) { handle(err, res); }
});

// GET /jobs/:id
jobsRouter.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const job = await getJob(req.params['id']!, req.user?.userId);
    sendSuccess(res, job, 'Job retrieved');
  } catch (err) { handle(err, res); }
});

// POST /jobs — recruiter or company_admin only
jobsRouter.post('/', authenticate, requireRole('recruiter', 'company_admin', 'platform_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const job = await createJob(req.user!.userId, req.body as Parameters<typeof createJob>[1]);
    // Fire-and-forget job match notification
    void notifyJobMatch(job._id);
    sendSuccess(res, job, 'Job created', 201);
  } catch (err) { handle(err, res); }
});

// PUT /jobs/:id
jobsRouter.put('/:id', authenticate, requireRole('recruiter', 'company_admin', 'platform_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const job = await updateJob(req.params['id']!, req.user!.userId, req.body as Parameters<typeof updateJob>[2]);
    sendSuccess(res, job, 'Job updated');
  } catch (err) { handle(err, res); }
});

// POST /jobs/:id/apply
jobsRouter.post('/:id/apply', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { coverNote } = req.body as { coverNote?: string };
    const result = await applyToJob(req.params['id']!, req.user!.userId, coverNote);
    sendSuccess(res, result, 'Application submitted', 201);
  } catch (err) { handle(err, res); }
});

// ── Applications router ───────────────────────────────────────────────────────

applicationsRouter.use(authenticate);

// GET /applications
applicationsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const apps = await getMyApplications(req.user!.userId);
    sendSuccess(res, apps, 'Applications retrieved');
  } catch (err) { handle(err, res); }
});

// ── Recruiter router ──────────────────────────────────────────────────────────

recruiterRouter.use(authenticate, requireRole('recruiter', 'company_admin', 'platform_admin'));

// GET /recruiter/applications/:jobId
recruiterRouter.get('/applications/:jobId', async (req: AuthRequest, res: Response) => {
  try {
    const apps = await getJobApplications(req.params['jobId']!, req.user!.userId);
    sendSuccess(res, apps, 'Applications retrieved');
  } catch (err) { handle(err, res); }
});

// PUT /recruiter/applications/:appId
recruiterRouter.put('/applications/:appId', async (req: AuthRequest, res: Response) => {
  try {
    const { status, note } = req.body as { status: AppStatus; note?: string };
    if (!status) { sendError(res, 'status required', 400, ApiErrorCode.VALIDATION_ERROR); return; }
    await updateApplicationStatus(req.params['appId']!, req.user!.userId, status, note);
    sendSuccess(res, null, 'Status updated');
  } catch (err) { handle(err, res); }
});

// GET /recruiter/pipeline/:jobId
recruiterRouter.get('/pipeline/:jobId', async (req: AuthRequest, res: Response) => {
  try {
    const pipeline = await getJobPipeline(req.params['jobId']!, req.user!.userId);
    sendSuccess(res, pipeline, 'Pipeline retrieved');
  } catch (err) { handle(err, res); }
});

export { jobsRouter, applicationsRouter, recruiterRouter };
