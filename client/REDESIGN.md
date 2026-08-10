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
