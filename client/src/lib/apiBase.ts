// Resolves to the Render backend in production, empty string in local dev (Vite proxy)
export const API_ORIGIN = import.meta.env.VITE_API_BASE_URL ?? '';

// Prevent multiple simultaneous refresh calls
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_ORIGIN}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { success: boolean; data: { token: string } };
      if (!data.success) return null;

      // Update Zustand store with the new token
      const { useAuthStore } = await import('../features/auth/useAuth');
      const { user } = useAuthStore.getState();
      if (user) useAuthStore.getState().setAuth(user, data.data.token);
      return data.data.token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// HIGH-16: when a JWT refresh fails the user must see *something* — silently
// rejecting every subsequent request gives no signal that they need to log
// back in. This flag debounces the alert so we don't spam a dozen popups
// when many requests fire simultaneously.
let sessionExpiredShown = false;
function notifySessionExpired(): void {
  if (sessionExpiredShown) return;
  sessionExpiredShown = true;
  // alert() is intentional: it blocks the UI thread so the user sees it
  // immediately even if many in-flight requests fail at once. Apps that
  // need a styled modal can replace this with a router event or toast.
  try { window.alert('Your session has expired. Please log in again.'); } catch { /* SSR/test */ }
  try {
    // Defer the navigation slightly so the alert finishes painting first.
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
      }
    }, 50);
  } catch { /* ignore */ }
}

/**
 * Shared fetch helper that attaches the Bearer token from the Zustand auth
 * store to every request, and silently refreshes the token on 401 (once).
 */
export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const { useAuthStore } = await import('../features/auth/useAuth');
  const { accessToken } = useAuthStore.getState();

  const buildHeaders = (token: string | null): Record<string, string> => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((init.headers as Record<string, string>) ?? {}),
    };
    // Let the browser set Content-Type for FormData (multipart boundary)
    if (init.body instanceof FormData) delete h['Content-Type'];
    return h;
  };

  const doFetch = (token: string | null) =>
    fetch(url, { credentials: 'include', ...init, headers: buildHeaders(token) });

  let res = await doFetch(accessToken);

  // Silent refresh on 401 — try once, then give up
  if (res.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      res = await doFetch(newToken);          // retry with fresh token
    } else {
      // HIGH-16: refresh failed. Force logout, notify the user, redirect to /login.
      const { useAuthStore: store } = await import('../features/auth/useAuth');
      await store.getState().logout();
      notifySessionExpired();
      throw new Error('Session expired. Please log in again.');
    }
  }

  const json = (await res.json()) as { success: boolean; data: T; message: string };
  if (!json.success) throw new Error((json as unknown as { message: string }).message);
  return json.data;
}
