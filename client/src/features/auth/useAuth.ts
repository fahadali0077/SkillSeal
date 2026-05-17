import { API_ORIGIN } from '../../lib/apiBase';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApiRequestError } from './authApi';

/** Parse a non-OK fetch response into a typed ApiRequestError so callers can
 *  branch on `err.code` (e.g. EMAIL_NOT_VERIFIED) and show targeted UI. */
async function asApiError(r: Response, fallbackMsg: string): Promise<ApiRequestError> {
  let body: { message?: string; code?: string } = {};
  try { body = await r.json(); } catch { /* non-JSON body */ }
  return new ApiRequestError(
    body.message ?? fallbackMsg,
    body.code ?? 'INTERNAL_ERROR',
    r.status,
  );
}

export interface AuthUser {
  _id: string;
  firstName: string;
  email: string;
  accountType: string;
  role: 'candidate' | 'recruiter' | 'company_admin' | 'platform_admin';
  emailVerified: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ role: string }>;
  register: (data: { firstName: string; lastName: string; email: string; password: string; role?: 'candidate' | 'recruiter' }) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(persist(
  (set) => ({
    user: null, accessToken: null, isLoading: false,

    setAuth: (user: AuthUser, accessToken: string) => set({ user, accessToken }),

    logout: async () => {
      await fetch(`${API_ORIGIN}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' });
      set({ user: null, accessToken: null });
    },

    login: async (email: string, password: string) => {
      set({ isLoading: true });
      try {
        const r = await fetch(`${API_ORIGIN}/api/v1/auth/login`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!r.ok) throw await asApiError(r, 'Login failed');
        const data = await r.json();
        set({ user: data.data.user, accessToken: data.data.token, isLoading: false });
        return { role: data.data.user.role ?? 'candidate' };
      } catch (e) { set({ isLoading: false }); throw e; }
    },

    register: async (payload) => {
      set({ isLoading: true });
      try {
        const r = await fetch(`${API_ORIGIN}/api/v1/auth/register`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw await asApiError(r, 'Registration failed');
        // Deliberately do NOT set user/accessToken in the store — the account
        // must be email-verified before the user can sign in. Storing auth
        // state here would trigger GuestRoute to redirect away from the
        // verification-pending screen.
        set({ isLoading: false });
      } catch (e) { set({ isLoading: false }); throw e; }
    },
  }),
  { name: 'SkillSeal-auth', partialize: (s) => ({ user: s.user, accessToken: s.accessToken }) }
));

export const useIsAuthenticated = () => useAuthStore(s => !!s.user && !!s.accessToken);
export const useUserRole = () => useAuthStore(s => s.user?.role ?? 'candidate');

/** Returns the home route for the current user based on their role */
export function homeRouteForRole(role: string): string {
  return role === 'recruiter' || role === 'company_admin' ? '/recruiter' : '/feed';
}
