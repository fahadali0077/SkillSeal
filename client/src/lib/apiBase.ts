// Resolves to the Render backend in production, empty string in local dev (Vite proxy)
export const API_ORIGIN = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Shared fetch helper that automatically attaches the Bearer token from the
 * Zustand auth store to every request.  Import this in every feature API file
 * instead of defining a local apiFetch.
 */
export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  // Import inline to avoid a circular-dependency at module load time
  const { useAuthStore } = await import('../features/auth/useAuth');
  const { accessToken } = useAuthStore.getState();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };

  // When the caller provides FormData (file upload) remove Content-Type so the
  // browser can set the correct multipart boundary automatically.
  if (init.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const res = await fetch(url, {
    credentials: 'include',
    ...init,
    headers,
  });

  const json = (await res.json()) as { success: boolean; data: T; message: string };
  if (!json.success) throw new Error((json as unknown as { message: string }).message);
  return json.data;
}
