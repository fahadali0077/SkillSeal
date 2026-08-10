# SkillSeal — "The Seal of Record"

Implementation of the direction in `SkillSeal Redesign.dc.html`. The product's
visual language moves from **feed** to **registry**: the look of a document that
was issued, stamped, and can be looked up.

Verified before handover: `tsc --noEmit` clean · 28/28 tests passing · `vite build` succeeds ·
no horizontal overflow at 360 / 390 / 768 / 1280.

---

## The rules this codebase now follows

| Rule | Where it's enforced |
|---|---|
| Radius ceiling 8px — controls 4, cards 6, frames 8 | `tailwind.config.cjs` → `borderRadius`. `rounded-2xl` now *is* 8px, so legacy markup complies automatically. |
| Borders before shadows | `.card` is border-only. `shadow-raised` is used on exactly two objects: the landing certificate and the preflight declaration. |
| One `seal-600` element per view | `.btn-primary` maps to **ink**, not oxblood. Oxblood is placed by hand, and is always the issuance action. |
| All numbers in mono | `.stat`, `.num`, `.credential-id`, and `font-mono tabular-nums` on every score, ID, date, count, timer and percentage. |
| No gradients, no blur, no emoji | 52 gradients, 18 backdrop-blurs and all emoji removed. Greppable to zero. |
| Icons at 1.5 stroke | `.lucide { stroke-width: 1.5 }` in `index.css` — set once, globally. |
| Motion is 160ms on `[0.2,0,0,1]`, press 0.99 | `src/lib/motion.ts`. Springs removed. |

---

## Files added

- `src/components/SealMark.tsx` — the mark (concept A: wax disc, milled dashed
  rim, struck serif S) plus the horizontal lockup. Rim drops below 20px, which
  is the favicon variant.
- `src/lib/motion.ts` — `enter`, `enterAt`, `enterOnView`, `press`.

## Files rewritten

**Foundation** — `tailwind.config.cjs`, `src/index.css`, `index.html` (three typefaces, ink theme-color).

**Shell** — `src/lib/Layout.tsx`. Text nav with an inset underline instead of
icon-over-label; role declared in a thin context strip rather than by recoloring
the chrome, so recruiters and admins see the same product, differently labelled.

**Verification flow** — `IsolationMode` (drops to ink, no app chrome, nothing
clickable but the answer), `MCQQuestion`, `ScenarioQuestion`, `MicroTheoryQuestion`,
`TimerBar`, `StrikeWarning` (restated as a recorded violation, not a toast),
`AssessmentLanding` (preflight is a declaration you sign; "Conditions of
examination"; plain instrument table replaces the emoji list).

**Profile** — `CertificationsSection` is a credential ledger with ID, issue date,
expiry, mono score and integrity. `SkillsSection` is visibly unsealed, dashed.
The gap between those two blocks is the product's argument.

**Jobs** — `JobCard` states "3 of 3 seals held" and which requirement is missing,
replacing the match percentage.

**Recruiter** — `TalentSearch` is a registry table with integrity as a column;
`PipelineView` stages escalate by weight not hue; `SessionAuditDrawer` reads as
an evidence record.

**Shared** — `PageHeader`, `ProfileCompletenessBar`.

## Swept (48 further files)

Legacy palette families are remapped in the config, so untouched markup inherits
the new language. The sweep additionally removed gradients, blurs, hardcoded
old-palette hexes, pill badges (avatars preserved), double borders, heavy focus
rings and hover-lift transforms.

---

## Notes for the next run

- **Fonts load from Google Fonts.** Screenshots taken in a sandboxed container
  fell back to system serif/mono; Newsreader and JetBrains Mono will sharpen the
  result noticeably in a normal environment.
- **`npm run lint` fails on a pre-existing issue** — `eslint-plugin-react` is
  referenced by `.eslintrc.json` but isn't installed. Unrelated to this work.
- **The credential ledger prints what the API gives it.** `ISkillEntry` currently
  carries only `status`, `verificationId` and `addedAt`; tier, score, expiry and
  integrity render the moment the endpoint supplies them, and are omitted
  gracefully until then. That's the one place worth a backend follow-up.
- **Timer colour assertions** in `src/tests/IsolationMode.test.tsx` were
  retargeted from the old blue/amber/red to the semantic `pass`/`warn`/`fail`
  hexes.

---

## Post-deploy fix pass

Seven screenshots from the live deploy surfaced two regressions and one broken
link. All three are fixed, and a contrast audit now guards the whole class.

### 1 · Invisible subtitles on page headers

The internal pages opened with dark gradient bands carrying white text. The
sweep flattened the gradient to warm paper but left the text white — so titles
survived (dark serif) while every subtitle vanished.

Those bands are now **document headers**: serif title, ink subtitle, hairline
rule beneath, decorative orbs gone. Affected: job search, my applications,
notifications, network, skill verification.

### 2 · Auth panel lost its background entirely

A narrower bug. My sweep stripped `bg-paper-sunk` from *every* element in any
file containing `bg-clip-text` — correct for the gradient-text node it targeted,
wrong for the file's other five. `AuthShell`'s left panel lost its surface, and
its white copy disappeared into the page. The `marketingTitle` spans had the
mirror problem: gradient text converted to `text-ink-900`, i.e. ink on ink.

`AuthShell` is rebuilt as a proper ink panel with paper text and a numbered
trust list. Register / reset / forgot titles now use `seal-300` on ink, and the
icon wells that lost their fill have paper backings again.

### 3 · `/verify/lookup` returned "Certificate Not Found"

My own error: I put that link in the landing nav, but the only route was
`/verify/:certificateId`, so "lookup" was parsed as an ID.

There is now a real `/verify` route with a certificate lookup form, and
`PublicVerifyPage` is restyled — the result renders as the same certificate
object used on the landing page, with status as a band rather than a big emoji
shield. The not-found state names the ID that failed and offers a retry.

### 4 · Contrast audit

`/tmp/contrast.py` walks every public route, computes each text node's WCAG
ratio against its own painted backdrop, and reports anything under 3.0. First
run: **13 failures**. Current run: **0**.

It also exposed a systemic flaw — legacy `text-gray-400` / `-500` carry meta and
secondary copy, and my ramp had placed them a step too light on warm paper.
`neutral-400` and `-500` are now one step darker, which fixed most failures at
the token level rather than screen by screen. Disabled buttons went from
`ink-400` to `ink-600` so they stay readable.

Worth keeping this script around and pointing it at authenticated routes with a
session cookie — the audit above only covers public pages.

---

## Tab-bar fix pass

### Favicon still showed the old blue shield

`public/favicon.svg` was untouched by the redesign — a blue rounded square with a
white shield and checkmark, i.e. exactly the consumer-app vocabulary the
direction replaces. It now carries the mark: a solid oxblood disc with the
struck serif S, rimless, per the spec's rule that the rim is dropped at 24px and
under.

The PNG set the HTML and manifest referenced (`favicon-16/32/96`) never existed
in `public/`, and `apple-touch-icon.png` was a zero-byte file — so every browser
was falling back to the SVG. All are now generated from the mark, with the
milled rim retained at 96px and above where it reads. Added 192 and 512 for
Android and install prompts. `site.webmanifest` moves to the ink theme colour on
a paper background.

### Home screen showed "Log In | SkillSeal"

`useSEO` sets `document.title` on mount but never restores it, and
`LandingPage` never called the hook — so navigating login → home left the login
title in the tab. Client-side navigation made it stick indefinitely.

`LandingPage` now claims the title, as do the four other routed pages that were
missing it: post detail, verify-email, company, and billing. Verified by
driving the SPA navigation rather than reloading, which is where the bug
actually showed.

The default title and description were also still the old positioning
("Verified Skills for Proven Hiring", AI-assessment copy). Both now read from
the redesign's language in `useSEO` and in the static `index.html` head.
