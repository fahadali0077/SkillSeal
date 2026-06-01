# SkillSeal — Platform Admin Module

A complete platform-administration module built on top of your existing
`platform_admin` role and `requireRole` middleware. Nothing here changes
existing behaviour for candidates or recruiters.

## What you get

**Backend** (`/api/v1/admin`, all routes gated by `requireRole('platform_admin')`)

- `GET  /stats` — dashboard analytics (user/role counts, suspended, 7/30-day signups, verification status breakdown, session completion, catalog totals, 30-day signup trend)
- `GET  /users` · `GET /users/:id` — paginated, searchable, filterable user list + detail (with that user's verifications)
- `PATCH /users/:id/role` — change a user's role
- `PATCH /users/:id/suspend` · `/reactivate` — block / unblock login
- `DELETE /users/:id` — schedule deletion (reuses your existing 30-day soft-delete fence) or `?immediate=true` to hard-delete
- `GET  /verifications` · `PATCH /verifications/:id/revoke` — certificate oversight
- `GET  /skills` · `POST /skills` · `PUT /skills/:id` · `PATCH /skills/:id/toggle` — skill catalog management
- `GET  /jobs` · `PATCH /jobs/:id/status` and `GET /posts` · `DELETE /posts/:id` — content moderation

**Frontend** — a tabbed Admin Console at `/admin` (Overview · Users · Verifications · Skills · Moderation),
guarded to `platform_admin` only, with an "Admin" entry in the top nav and avatar menu.

## Files

**New (backend)**
- `server/src/services/admin.service.ts`
- `server/src/routes/admin.routes.ts`
- `server/src/scripts/promoteAdmin.ts`

**New (frontend)**
- `client/src/features/admin/adminApi.ts`
- `client/src/features/admin/adminUi.tsx`
- `client/src/features/admin/AdminDashboard.tsx`
- `client/src/features/admin/AdminOverview.tsx`
- `client/src/features/admin/AdminUsers.tsx`
- `client/src/features/admin/AdminUserDrawer.tsx`
- `client/src/features/admin/AdminVerifications.tsx`
- `client/src/features/admin/AdminSkills.tsx`
- `client/src/features/admin/AdminModeration.tsx`

**Modified**
- `server/src/models/User.model.ts` — added `status`, `suspendedReason`, `suspendedAt`, `lastLoginAt` + two indexes
- `server/src/services/auth.service.ts` — login now blocks suspended accounts and stamps `lastLoginAt`
- `server/src/app.ts` — mounts `adminRouter` at `/api/v1/admin`
- `client/src/App.tsx` — adds the guarded `/admin` route
- `client/src/features/auth/useAuth.ts` — `homeRouteForRole` sends admins to `/admin`
- `client/src/lib/Layout.tsx` — admin nav + avatar-menu entry

## Database migration

None required. The new `User` fields are additive with safe defaults
(`status: 'active'`), so existing documents work unchanged — Mongoose applies
the default the first time each doc is written, and queries treat a missing
`status` as not-suspended.

## Creating the first admin

Roles can be assigned from the Users tab once an admin exists, but the very
first admin has to be promoted out-of-band. Register & verify a normal account,
then run **once**:

```bash
# locally
cd server
npx ts-node src/scripts/promoteAdmin.ts you@example.com

# on Render (Shell, after a build so dist/ exists)
node dist/scripts/promoteAdmin.js you@example.com
```

The script is idempotent. After it runs, **log out and back in** so the new
JWT carries the `platform_admin` role, then open `/admin`.

> Note: `build:prod` deletes `dist/scripts` after seeding, so run `promoteAdmin`
> from a normal `build` output, or temporarily via `ts-node`, or set
> `ADMIN_EMAIL` and invoke it before the cleanup step.

## How suspension works

Suspending sets `status: 'suspended'`, stores the reason, and bumps
`tokenVersion` — so existing access/refresh tokens die immediately and the next
login is rejected with `ACCOUNT_SUSPENDED` (that error code already existed in
your shared enum). Reactivating clears the flag. Self-protection guards prevent
an admin from suspending, demoting, or deleting their own account or another
`platform_admin`.

## Build / verify

```bash
npm run build:shared
npm run build:server      # tsc → clean
npm run build:client      # tsc && vite build → clean
```

Both compile with zero new errors.
