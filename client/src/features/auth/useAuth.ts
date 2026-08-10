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
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  /** True until the on-load token refresh settles (AUDIT §1.3). */
  isBootstrapping: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ role: string }>;
  register: (data: { firstName: string; lastName: string; email: string; password: string; role?: 'candidate' | 'recruiter' }) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(persist(
  (set) => ({
    user: null as AuthUser | null,
    accessToken: null as string | null,
    isLoading: false,
    isBootstrapping: true,

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
  {
    name: 'SkillSeal-auth',
    // AUDIT §1.3: the access token used to be persisted here, which put a live
    // bearer credential in localStorage where any XSS could read it — bypassing
    // the httpOnly protection the refresh cookie already has. Only the user
    // profile is persisted now (so the shell can render immediately); the token
    // lives in memory and is re-obtained on load from the httpOnly refresh
    // cookie via bootstrapAuth() below.
    partialize: (s) => ({ user: s.user }),
    version: 2,
    migrate: (persisted) => {
      // Drop any accessToken left over in localStorage from the previous version.
      const p = persisted as { user?: AuthUser; accessToken?: string } | null;
      if (p && 'accessToken' in p) delete p.accessToken;
      return p as { user: AuthUser | null };
    },
  },
));

/**
 * AUDIT §1.3: re-establishes the in-memory access token on page load using the
 * httpOnly refresh cookie. Called once from App. Until it settles, `isBootstrapping`
 * is true so the route guards don't bounce a logged-in user to /login.
 */
export async function bootstrapAuth(): Promise<void> {
  const { user, accessToken } = useAuthStore.getState();
  if (!user || accessToken) { useAuthStore.setState({ isBootstrapping: false }); return; }
  try {
    const r = await fetch(`${API_ORIGIN}/api/v1/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (r.ok) {
      const data = await r.json() as { success: boolean; data: { token: string } };
      if (data.success) useAuthStore.setState({ accessToken: data.data.token });
      else useAuthStore.setState({ user: null });
    } else {
      // Refresh cookie gone or rejected — the persisted profile is stale.
      useAuthStore.setState({ user: null });
    }
  } catch {
    useAuthStore.setState({ user: null });
  } finally {
    useAuthStore.setState({ isBootstrapping: false });
  }
}

export const useIsAuthenticated = () => useAuthStore(s => !!s.user && !!s.accessToken);
/** Auth state is still resolving — guards should wait rather than redirect. */
export const useIsBootstrapping = () => useAuthStore(s => s.isBootstrapping);
export const useUserRole = () => useAuthStore(s => s.user?.role ?? 'candidate');

/** Returns the home route for the current user based on their role */
export function homeRouteForRole(role: string): string {
  if (role === 'platform_admin') return '/admin';
  return role === 'recruiter' || role === 'company_admin' ? '/recruiter' : '/feed';
}
