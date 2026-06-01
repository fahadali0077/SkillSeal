import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { IUserPublic, IExperience, IEducation, ILink } from '@SkillSeal/shared';
import { profileApi } from './profileApi';

const PROFILE_KEY = (id: string) => ['profile', id] as const;
const COMPLETE_KEY = (id: string) => ['completeness', id] as const;

// ── Queries ───────────────────────────────────────────────────────────────────

export function useProfile(id: string) {
  return useQuery({
    queryKey: PROFILE_KEY(id),
    queryFn: () => profileApi.getProfile(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCompleteness(id: string) {
  return useQuery({
    queryKey: COMPLETE_KEY(id),
    queryFn: () => profileApi.getCompleteness(id),
    enabled: !!id,
  });
}

export function useSearch(params: Record<string, string | boolean | number>, enabled = true) {
  return useQuery({
    queryKey: ['search', params],
    queryFn: () => profileApi.search(params),
    enabled,
  });
}

// ── Mutations (all invalidate the profile cache on success) ───────────────────

function useProfileMutation<TInput>(
  userId: string,
  mutFn: (data: TInput) => Promise<IUserPublic>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mutFn,
    onSuccess: (updated) => {
      qc.setQueryData(PROFILE_KEY(userId), updated);
      qc.invalidateQueries({ queryKey: COMPLETE_KEY(userId) });
    },
  });
}

export function useUpdateProfile(userId: string) {
  return useProfileMutation(
    userId,
    (data: Parameters<typeof profileApi.updateProfile>[1]) =>
      profileApi.updateProfile(userId, data),
  );
}

export function useAddExperience(userId: string) {
  return useProfileMutation(
    userId,
    (entry: Omit<IExperience, '_id'>) => profileApi.addExperience(userId, entry),
  );
}

export function useUpdateExperience(userId: string) {
  return useProfileMutation(
    userId,
    ({ expId, patch }: { expId: string; patch: Partial<Omit<IExperience, '_id'>> }) =>
      profileApi.updateExperience(userId, expId, patch),
  );
}

export function useDeleteExperience(userId: string) {
  return useProfileMutation(
    userId,
    (expId: string) => profileApi.deleteExperience(userId, expId),
  );
}

export function useAddEducation(userId: string) {
  return useProfileMutation(
    userId,
    (entry: Omit<IEducation, '_id'>) => profileApi.addEducation(userId, entry),
  );
}

export function useUpdateEducation(userId: string) {
  return useProfileMutation(
    userId,
    ({ eduId, patch }: { eduId: string; patch: Partial<Omit<IEducation, '_id'>> }) =>
      profileApi.updateEducation(userId, eduId, patch),
  );
}

export function useDeleteEducation(userId: string) {
  return useProfileMutation(
    userId,
    (eduId: string) => profileApi.deleteEducation(userId, eduId),
  );
}

export function useAddSkill(userId: string) {
  return useProfileMutation(
    userId,
    (skillId: string) => profileApi.addSkill(userId, skillId),
  );
}

export function useRemoveSkill(userId: string) {
  return useProfileMutation(
    userId,
    (skillId: string) => profileApi.removeSkill(userId, skillId),
  );
}

export function useUploadPhoto(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => profileApi.uploadPhoto(userId, file),
    onSuccess: ({ photoUrl }) => {
      qc.setQueryData<IUserPublic>(PROFILE_KEY(userId), (old) =>
        old ? { ...old, profilePhoto: photoUrl } : old,
      );
      qc.invalidateQueries({ queryKey: COMPLETE_KEY(userId) });
    },
  });
}
