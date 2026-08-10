// ─────────────────────────────────────────────────────────────────────────────
// origins.ts — the one allowlist.
//
// AUDIT §2.3: app.ts and socket/socket.ts each had their own CORS origin config.
// app.ts's list was widened to cover the `www` host after a real production bug
// (the browser sent https://www.skillseal.tech while CLIENT_URL was set without
// the `www`, and login 403'd). socket/socket.ts was never updated to match and
// still allowed only the single CLIENT_URL value — so on the `www` host every
// real-time feature (messaging, notifications, live session state) would have
// failed silently while the REST API worked fine.
//
// Both now import from here. Adding a host is a one-line change in one place.
// ─────────────────────────────────────────────────────────────────────────────

export const allowedOrigins: string[] = [
  process.env.CLIENT_URL,
  // Explicitly cover both www and non-www regardless of CLIENT_URL value.
  'https://skillseal.tech',
  'https://www.skillseal.tech',
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean) as string[];

/** Shared origin check. A missing Origin header (same-origin, curl, server-to-server) is allowed. */
export function isOriginAllowed(origin: string | undefined): boolean {
  return !origin || allowedOrigins.includes(origin);
}
