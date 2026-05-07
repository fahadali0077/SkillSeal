// Resolves to the Render backend in production, empty string in local dev (Vite proxy)
export const API_ORIGIN = import.meta.env.VITE_API_BASE_URL ?? '';
