import { API_ORIGIN } from '../../lib/apiBase';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export interface AuthUser { _id: string; firstName: string; email: string; accountType: string; }
interface AuthState { user: AuthUser | null; accessToken: string | null; isLoading: boolean; setAuth: (user: AuthUser, token: string) => void; logout: () => Promise<void>; login: (email: string, password: string) => Promise<void>; register: (data: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>; }
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
        const data = await r.json();
        if (!r.ok) throw new Error(data.message ?? 'Login failed');
        set({ user: data.data.user, accessToken: data.data.token, isLoading: false });
      } catch (e) { set({ isLoading: false }); throw e; }
    },
    register: async (payload: { firstName: string; lastName: string; email: string; password: string }) => {
      set({ isLoading: true });
      try {
        const r = await fetch(`${API_ORIGIN}/api/v1/auth/register`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.message ?? 'Registration failed');
        set({ user: data.data.user, accessToken: data.data.token, isLoading: false });
      } catch (e) { set({ isLoading: false }); throw e; }
    },
  }),
  { name: 'SkillSeal-auth', partialize: (s) => ({ user: s.user, accessToken: s.accessToken }) }
));
export const useIsAuthenticated = () => useAuthStore(s => !!s.user && !!s.accessToken);
