// ─────────────────────────────────────────────────────────────────────────────
// useJobs.ts  –  React Query hooks for job board
// ─────────────────────────────────────────────────────────────────────────────
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { jobsApi, type JobSearchParams, type CreateJobInput } from './jobsApi';

export const jobKeys = {
  search:   (p: JobSearchParams) => ['jobs', 'search', p] as const,
  detail:   (id: string)         => ['jobs', 'detail', id] as const,
  myApps:   ()                   => ['jobs', 'myApplications'] as const,
  jobApps:  (jobId: string)      => ['jobs', 'applications', jobId] as const,
  pipeline: (jobId: string)      => ['jobs', 'pipeline', jobId] as const,
};

export function useJobSearch(params: JobSearchParams, enabled = true) {
  return useQuery({
    queryKey: jobKeys.search(params),
    queryFn:  () => jobsApi.search(params),
    enabled,
    staleTime: 60_000,
  });
}

export function useJobDetail(id: string) {
  return useQuery({
    queryKey: jobKeys.detail(id),
    queryFn:  () => jobsApi.getJob(id),
    enabled:  !!id,
    staleTime: 60_000,
  });
}

export function useMyApplications() {
  return useQuery({
    queryKey: jobKeys.myApps(),
    queryFn:  jobsApi.myApplications,
    staleTime: 30_000,
  });
}

export function useJobApplications(jobId: string) {
  return useQuery({
    queryKey: jobKeys.jobApps(jobId),
    queryFn:  () => jobsApi.getJobApplications(jobId),
    enabled:  !!jobId,
  });
}

export function usePipeline(jobId: string) {
  return useQuery({
    queryKey: jobKeys.pipeline(jobId),
    queryFn:  () => jobsApi.getPipeline(jobId),
    enabled:  !!jobId,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJobInput) => jobsApi.createJob(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useApplyToJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, coverNote }: { jobId: string; coverNote?: string }) =>
      jobsApi.apply(jobId, coverNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobKeys.myApps() });
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useUpdateAppStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, status, note }: { appId: string; status: string; note?: string }) =>
      jobsApi.updateAppStatus(appId, status, note),
    onSuccess: (_data, { appId }) => {
      qc.invalidateQueries({ queryKey: ['jobs', 'applications'] });
      qc.invalidateQueries({ queryKey: ['jobs', 'pipeline'] });
    },
  });
}
