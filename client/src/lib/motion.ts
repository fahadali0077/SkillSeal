// ─────────────────────────────────────────────────────────────────────────────
// motion.ts – the redesign's motion vocabulary.
// enter: y 6 → 0 and opacity 0 → 1 over 160ms on ease [0.2, 0, 0, 1].
// stagger: 24ms, capped at 6 items. press: scale 0.99.
// Shorter and flatter than the old spring — official things do not bounce.
// ─────────────────────────────────────────────────────────────────────────────

export const EASE_SEAL = [0.2, 0, 0, 1] as const;
export const DUR = 0.16;

export const enter = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
  transition: { duration: DUR, ease: EASE_SEAL },
};

/** Staggered list entry — index is clamped so long lists don't crawl in. */
export const enterAt = (index: number) => ({
  ...enter,
  transition: { duration: DUR, ease: EASE_SEAL, delay: Math.min(index, 6) * 0.024 },
});

/** Scroll-triggered variant. Never hides content: only the offset animates, so
 *  a missed intersection callback can't leave a section blank. */
export const enterOnView = (delay = 0) => ({
  initial: { y: 6 },
  whileInView: { y: 0 },
  viewport: { once: true, amount: 0 },
  transition: { duration: DUR * 1.5, ease: EASE_SEAL, delay },
});

export const press = { scale: 0.99 };

export const transition = { duration: DUR, ease: EASE_SEAL };
