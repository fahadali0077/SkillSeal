// ─────────────────────────────────────────────────────────────────────────────
// authApi.ts
// All authentication API calls + React Query mutations.
// ─────────────────────────────────────────────────────────────────────────────

import { useMutation } from '@tanstack/react-query';
import type {
  IUserPublic,
  IUserPrivate,
  IApiSuccess,
  IApiError,
} from '@SkillSeal/shared';

// ── Base fetch ────────────────────────────────────────────────────────────────

import { API_ORIGIN } from '../../lib/apiBase';
const API_BASE = `${API_ORIGIN}/api/v1/auth`;

async function authFetch<T>(
  path: string,
  opts: RequestInit = {},
): Promise<IApiSuccess<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // sends httpOnly cookie
    ...opts,
  });

  const data = (await res.json()) as IApiSuccess<T> | IApiError;

  if (!data.success) {
    const err = data as IApiError;
    throw new ApiRequestError(err.message, err.code, res.status);
  }

  return data as IApiSuccess<T>;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

// ── Request / Response shapes ─────────────────────────────────────────────────

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterResponse {
  user: IUserPrivate;
  token: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: IUserPublic;
  token: string;
}

export interface RefreshResponse {
  token: string;
}

// ── Raw API functions ─────────────────────────────────────────────────────────

export const authApi = {
  register: (data: RegisterInput) =>
    authFetch<RegisterResponse>('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: LoginInput) =>
    authFetch<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refresh: () =>
    authFetch<RefreshResponse>('/refresh', { method: 'POST' }),

  logout: () =>
    authFetch<null>('/logout', { method: 'POST' }),

  verifyEmail: (token: string) =>
    authFetch<null>('/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  forgotPassword: (email: string) =>
    authFetch<null>('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    authFetch<null>('/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
};

// ── React Query mutations ─────────────────────────────────────────────────────

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (data: RegisterInput) => authApi.register(data),
  });
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: (data: LoginInput) => authApi.login(data),
  });
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: () => authApi.logout(),
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      authApi.resetPassword(token, newPassword),
  });
}

export function useVerifyEmailMutation() {
  return useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
  });
}
