# Audit Remediation

Every item is verified by execution — tests, a live HTTP probe against the real
Express app, or a browser check — not by inspection.

**Final state:** server 181 tests / 9 suites passing · client 32 tests passing ·
both packages type-check and build · dependency vulnerabilities 26 → 4
(no critical, none direct, all transitive under vite/vitest build tooling).

---

## Fixed

| # | Finding | Fix | Verified by |
|---|---|---|---|
| §7.1 | `npm test` failed — duplicate Jest config + missing `@types/jest` | Removed the `jest` key from `server/package.json` (kept the richer `jest.config.ts`); added `@types/jest` | `npm test` runs via the documented command; 146 → 181 tests |
| §1.1 | `sanitizeInput` / `xssSanitize` never imported | Mounted in `app.ts` after the body parsers, ahead of all routers — which also finally registers the `$where`-blocking Mongoose plugin | Live probe: `<script>` payload now stripped |
| §1.1 | `authLimiter` / `registerLimiter` never imported | Wired onto register (5/hr), login, forgot-password, resend-verification, reset-password (20/min) | Route definitions + tests pass |
| §1.2 | 26 vulns (1 critical, 9 high) | `npm audit fix` plus targeted bumps: axios, express, mongoose, morgan, react-router-dom v7, vitest 3, node-cron v4. **uuid was dropped entirely** in favour of Node's built-in `crypto.randomUUID` — see the postmortem below | 26 → 4; each bump verified by build, tests **and** a compiled-output smoke check |
| §1.3 | Access token in `localStorage` | Token is memory-only; `partialize` persists the profile alone. Added `bootstrapAuth()` to re-obtain it from the httpOnly refresh cookie on load, a `version: 2` migration that purges legacy tokens, and an `isBootstrapping` gate so guards wait instead of bouncing to `/login`. All three ad hoc `localStorage.getItem` call sites now read the store | Browser check: a seeded legacy token is purged on reload |
| §2.1 / §7.3 | Hardcoded JWT fallback secrets | `utils/jwt.ts` imports the Zod-validated `config/env.ts` | The audit's own PoC now hard-fails at import instead of forging a `platform_admin` token |
| §2.2 | CSP `'unsafe-inline'` | Removed from the server CSP (API serves JSON only) **and** from the client CSP in `vercel.json`, along with `'unsafe-eval'` | Production build served under the strict policy: renders with **0** CSP violations |
| §2.3 | Socket.IO CORS drift | Extracted `config/origins.ts`, shared by `app.ts` and `socket/socket.ts` | Live probe: `www` host allowed on both |
| §2.5 | README claimed GPT-4o; code calls Groq | Renamed `config/gemini.ts` → `config/groq.ts`, dropped the `getGemini` alias, added `AI_MODEL`. `GROQ_API_KEY` is the correct variable, with `GEMINI_API_KEY` accepted as a legacy fallback so deployments keep booting during the rename. README corrected | Tests pass; boot log renamed |
| §3 / §5 | `admin.service.ts` had zero coverage | New `admin.test.ts` — 19 tests over self-protection, peer protection, `tokenVersion` invalidation, input validation and certificate revocation. Models are mocked, so it runs in CI without MongoDB | 19/19 passing |
| §4 | Client `noImplicitAny: false` | Enabled, and the 4 resulting errors fixed | `tsc --noEmit`: 0 errors |
| §4 | Orphaned `shared/src/types/*.ts` | Deleted the 7 superseded files | Shared builds; both packages type-check |
| §7.2 | CORS rejection surfaced as 500 | Rejects with an `AppError` → 403 | Live probe: 403, no ACAO header |
| §7.4 | `password` validator accepted objects | `.isString().bail()` on password/token/name fields | Live probe: `{"$ne":null}` → 400, was 500 |

## Found during remediation — not in the audit

**1. A live, unauthenticated debug endpoint.** `POST /api/v1/auth/_debug/email`
was marked `⚠️ TEMPORARY DIAGNOSTIC — REMOVE BEFORE LAUNCH` and shipped anyway.
It sent a real email to **any** address in the request body — an open relay
usable for spam or for phishing that appears to originate from your domain — and
returned SMTP host, port, whether credentials were set, and raw SMTP error text
to the caller. Removed; now 404s.

**2. The XSS stripper never worked.** Live probing showed `javascript:` and
`on*=` stripped but `<script>` passing through untouched. The pattern contained a
literal **0x08 backspace byte** where `\b` was intended, plus `<\\/script>`
instead of `<\/script>`. Wiring the middleware up (§1.1) alone would **not**
have closed the gap. This is exactly why it survived: nothing imported the file,
so nothing exercised it. Rewritten and covered by 16 new tests.

**3. A malformed directive in the client CSP.** The `connect-src` value ended
`... https://sentry.io frame-src 'none'; object-src 'none';` — the missing `;`
meant `frame-src` was parsed as two extra `connect-src` hosts and the `frame-src`
directive never applied at all. Fixed, and `base-uri` / `form-action` /
`frame-ancestors` added.

---

## Still open

| Finding | Why deferred |
|---|---|
| §2.6 Billing half-wired | A product decision — finish Stripe or remove the UI. Not a vulnerability: the router is unmounted and webhook signature verification is correct but unreachable. |
| §4 `noUnusedLocals` / `noUnusedParameters` | 27 errors. Mechanical but broad; worth its own pass rather than being bundled with security fixes. |
| §5 Untested services | `users`, `feed`, `messages`, `notifications`, `companies`, `suggestions`, `email`. `admin` was done first as the highest-privilege surface. |
| 4 remaining vulns | All transitive under `vite`/`vitest`; fixes need a `vite` major. Build tooling, not runtime request handling. |
| §7 DB-dependent flows | MongoDB still can't be provisioned here (`fastdl.mongodb.org` is outside the egress allowlist), so authenticated end-to-end flows against real records remain unexercised. |


---

## Postmortem — the uuid@14 deploy failure

**What happened.** Bumping `uuid` to v14 (for a moderate advisory affecting v3/v5/v6,
which this codebase does not use — only `v4`) broke the production boot:

```
Error [ERR_REQUIRE_ESM]: require() of ES Module .../uuid/dist-node/index.js
from .../dist/ai/questionGenerator.js not supported.
```

uuid v14 is `"type": "module"` with no `require` export. The server compiles to
CommonJS, so the emitted `require('uuid')` throws at load.

**Why the checks missed it — two independent gaps:**

1. **Nothing loaded the compiled output.** `tsc --noEmit` type-checks without
   emitting or running anything, and ts-jest applies its own module interop, so
   the Jest suite never exercised the CJS that actually ships. Both were green.
2. **The local Node was newer than the deployed Node.** Node ≥ 22.12 permits
   `require()` of an ES module; the sandbox ran 22.22 while Render runs 20.14
   (per `.node-version`). Even a smoke test would have passed locally and failed
   in production.

**Fixes.**

- `uuid` removed as a dependency. `crypto.randomUUID()` is built into Node, is
  v4, and carries no advisory — strictly better than pinning an older release.
- New `server/scripts/smoke-dist.cjs` require()s every compiled module in
  `dist/`, and **re-execs itself with `--no-experimental-require-module`** so it
  always enforces the stricter Node 20 semantics regardless of the local
  version. Wired into `build:prod`, so an ESM-only dependency now fails the
  build rather than the boot.
- Verified the check is real: against the broken `uuid@14` build it exits 1 and
  names `ai/questionGenerator.js` with the exact production error; against the
  fixed build it reports all 78 modules loading cleanly.

**The general lesson:** "type-checks and tests pass" says nothing about whether
the artifact you ship can be loaded. For a compiled server, the build must load
its own output, under the runtime the deploy target actually uses.
