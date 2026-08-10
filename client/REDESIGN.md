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

---

## Open Graph card

`public/og-image.jpg` was the last surviving piece of the old identity: dark blue
gradient, glowing shield, "Verify Your Skills. Get Hired Faster." in a
pink-to-blue gradient, "AI-Powered Skill Verification Platform" pill. Every
share link still carried it.

The replacement does what the landing hero does — shows the artifact rather than
claiming a feature. Warm paper, the seal, and a full-fidelity certificate with
its ID, score, integrity reading and expiry. Against the wall of dark-blue
gradient cards in a typical feed, paper stands out more than another dark card
would.

Regenerate with `tools/generate-og-image.py`. It renders the card headlessly at
exactly 1200×630 and writes both `og-image.png` and `og-image.jpg`. Because
Google Fonts is not reachable in a sandbox, the script embeds Newsreader, Public
Sans and JetBrains Mono as base64 `@font-face` rules pulled from the
`@fontsource/*` npm packages — so the output always uses the real typefaces
rather than a fallback serif.

Checked at 500px and 320px wide, which is roughly how Slack and iMessage render
an unfurl.

The document head had also been pointing at `og-image.jpg` in one place and
`og-image.png` in two others. It now uses the PNG throughout, which is what
`useSEO` already defaulted to, plus a declared `og:image:type` and a real
`og:image:alt`.

---

## Fix · app shell visible beneath the assessment result

**Symptom.** On `/assessment/active`, scrolling past the result screen revealed
the topbar, an empty page and the mobile nav sitting underneath it.

**Cause.** `AssessmentOverlay` is mounted at the App level, above `<Routes>`, and
`/assessment/active` renders `null` on the assumption that the overlay owns the
screen. That holds while a question is on screen — that view is
`fixed inset-0 z-[9000]`. But `IsolationMode` returned the completed and
terminated screens *bare*, before that wrapper. Those dropped into normal
document flow, while `<Routes>` went on rendering `Layout` with an empty body
below them.

This predates the redesign — the original file had the same shape — but the new
palette made the seam obvious, since the ink result now meets a paper shell
instead of two similar greys.

**Fix.** A `SessionShell` wrapper (`fixed inset-0 overflow-y-auto
overscroll-contain`, `role="dialog"`, `aria-modal`) now wraps every terminal
state, so the overlay owns the viewport in all of them and scrolls internally.
Added `useBodyScrollLock` so the page behind can't scroll underneath the overlay
at all, and marked the active view `aria-modal` too.

**Regression test.** `src/tests/IsolationMode.overlay.test.tsx` asserts that the
active, completed and terminated states each render inside a fixed modal
ancestor, and that body scroll is locked while mounted and restored on unmount.
Confirmed it fails against the pre-fix code rather than passing vacuously.

---

## Result screens reworked

`SessionComplete` and `SessionTerminated` had only had the automated sweep, so
they were internally consistent but not considered against the direction: a
circular score ring, a `rounded-full` status pill, five different hues on the
score bars, a gradient certificate panel, and a trophy icon.

**The framing now matches what the product is.** The examination happens in ink;
what it produces is a paper document. So the certificate renders as the same
artifact used on the landing page — white card, seal, mono ID, public URL —
sitting on the ink result screen. Nothing else on the screen is white, so the
issued object is unmistakably the point.

- Score ring → a large mono figure against `/100`, with the verdict as a serif
  headline rather than a badge.
- Score bars → labelled readings with hairline fills. Only status carries
  colour: integrity green, AI authenticity amber when flagged. The other three
  are ink.
- `SessionTerminated` → a record of what happened: result, what was written to
  the record, who can see it, and what happens next — stated as facts in a
  definition list rather than as a scolding.

### A contradiction the render caught

With `aiProbability > 0.5` the screen announced **"Certified"** and stamped the
certificate **"Sealed"**, directly above a notice saying the credential was
provisional pending review. A flagged pass now reads as provisional the whole
way down: the headline says "Provisionally certified", the status reads "Under
review", the certificate band says "Provisional", and the mark drops to ink so
it doesn't read as a finished seal.

### Test note

`SessionComplete.test.tsx`'s AI-flag case used `queryByText(/flag/i)`, which
started matching two nodes once a real notice existed (the notice, and the
`v-flagged` verification URL). The test had ended in
`expect(document.body).toBeTruthy()` — vacuous. It now asserts the notice
itself.
