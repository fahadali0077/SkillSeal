// ─────────────────────────────────────────────────────────────────────────────
// jobsApi.ts  –  typed REST calls for the job board system
// ─────────────────────────────────────────────────────────────────────────────
import type { IJob, IJobCard, EmploymentType, WorkType } from '@SkillSeal/shared';
import type { IApplicationOut, IRecruiterApplication } from './types';

import { API_ORIGIN, apiFetch } from '../../lib/apiBase';
const JOBS_BASE = `${API_ORIGIN}/api/v1/jobs`;
const APPS_BASE = `${API_ORIGIN}/api/v1/applications`;
const REC_BASE = `${API_ORIGIN}/api/v1/recruiter`;


export interface JobSearchParams {
  keyword?: string;
  skill?: string;
  tier?: string;
  verifiedOnly?: boolean;
  location?: string;
  workType?: string;
  employmentType?: string;
  salaryMin?: number;
  datePosted?: 'any' | 'week' | 'month';
  sort?: 'relevant' | 'recent' | 'salary';
  page?: number;
  limit?: number;
}

export interface JobSearchResult {
  jobs: IJobCard[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateJobInput {
  companyId: string;
  title: string;
  description: string;
  employmentType: EmploymentType;
  workType: WorkType;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  requiredSkills: { skillId: string; tier: string; required: boolean }[];
  easyApply: boolean;
  externalUrl?: string;
  deadline?: string;
}

export const jobsApi = {
  search: (params: JobSearchParams) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && qs.set(k, String(v)));
    return apiFetch<JobSearchResult>(`${JOBS_BASE}?${qs}`);
  },

  getJob: (id: string) => apiFetch<IJob>(`${JOBS_BASE}/${id}`),

  createJob: (data: CreateJobInput) =>
    apiFetch<IJob>(JOBS_BASE, { method: 'POST', body: JSON.stringify(data) }),

  updateJob: (id: string, data: Partial<CreateJobInput & { status: string }>) =>
    apiFetch<IJob>(`${JOBS_BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  apply: (jobId: string, coverNote?: string) =>
    apiFetch<{ applicationId: string }>(`${JOBS_BASE}/${jobId}/apply`, {
      method: 'POST', body: JSON.stringify({ coverNote }),
    }),

  myApplications: () => apiFetch<IApplicationOut[]>(APPS_BASE),

  getJobApplications: (jobId: string) =>
    apiFetch<IRecruiterApplication[]>(`${REC_BASE}/applications/${jobId}`),

  updateAppStatus: (appId: string, status: string, note?: string) =>
    apiFetch<null>(`${REC_BASE}/applications/${appId}`, {
      method: 'PUT', body: JSON.stringify({ status, note }),
    }),

  getPipeline: (jobId: string) =>
    apiFetch<Record<string, IRecruiterApplication[]>>(`${REC_BASE}/pipeline/${jobId}`),
};
