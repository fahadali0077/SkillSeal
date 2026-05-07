import type { IUserPublic, IExperience, IEducation, ILink, ICandidateCard } from '@SkillSeal/shared';

import { API_ORIGIN, apiFetch } from '../../lib/apiBase';
const BASE = `${API_ORIGIN}/api/v1/users`;


export const profileApi = {
  getProfile: (id: string) =>
    apiFetch<IUserPublic>(`${BASE}/${id}`),

  updateProfile: (id: string, data: Partial<{ headline: string; summary: string; location: { city: string; country: string }; openToWork: boolean; isHiring: boolean; links: ILink[]; customUrl: string }>) =>
    apiFetch<IUserPublic>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  addExperience: (id: string, entry: Omit<IExperience, '_id'>) =>
    apiFetch<IUserPublic>(`${BASE}/${id}/experience`, { method: 'POST', body: JSON.stringify(entry) }),

  updateExperience: (id: string, expId: string, patch: Partial<Omit<IExperience, '_id'>>) =>
    apiFetch<IUserPublic>(`${BASE}/${id}/experience/${expId}`, { method: 'PUT', body: JSON.stringify(patch) }),

  deleteExperience: (id: string, expId: string) =>
    apiFetch<IUserPublic>(`${BASE}/${id}/experience/${expId}`, { method: 'DELETE' }),

  addEducation: (id: string, entry: Omit<IEducation, '_id'>) =>
    apiFetch<IUserPublic>(`${BASE}/${id}/education`, { method: 'POST', body: JSON.stringify(entry) }),

  updateEducation: (id: string, eduId: string, patch: Partial<Omit<IEducation, '_id'>>) =>
    apiFetch<IUserPublic>(`${BASE}/${id}/education/${eduId}`, { method: 'PUT', body: JSON.stringify(patch) }),

  deleteEducation: (id: string, eduId: string) =>
    apiFetch<IUserPublic>(`${BASE}/${id}/education/${eduId}`, { method: 'DELETE' }),

  addSkill: (id: string, skillId: string) =>
    apiFetch<IUserPublic>(`${BASE}/${id}/skills`, { method: 'POST', body: JSON.stringify({ skillId }) }),

  removeSkill: (id: string, skillId: string) =>
    apiFetch<IUserPublic>(`${BASE}/${id}/skills/${skillId}`, { method: 'DELETE' }),

  uploadPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return apiFetch<{ photoUrl: string }>(`${BASE}/${id}/profile-photo`, {
      method: 'POST',
      headers: {},
      body: form,
    });
  },

  search: (params: Record<string, string | boolean | number>) => {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    return apiFetch<{ candidates: ICandidateCard[]; total: number; page: number; totalPages: number }>(
      `${BASE}/search?${qs}`
    );
  },

  getCompleteness: (id: string) =>
    apiFetch<{ score: number; sections: Record<string, { earned: number; max: number; label: string }> }>(
      `${BASE}/${id}/completeness`
    ),
};
