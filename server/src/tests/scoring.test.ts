// scoring.test.ts — pure-logic tests for the composite score formula
// These tests require NO database connection — all pure computation.

jest.mock('../config/redis', () => ({ getRedis: jest.fn() }));
jest.mock('../config/database', () => ({ connectDB: jest.fn() }));
jest.mock('../services/email.service', () => ({
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

// ── Composite formula ─────────────────────────────────────────────────────────
describe('Composite score formula', () => {
  function composite(c: number, sp: number, co: number, b: number, ai: number) {
    return c * 0.40 + sp * 0.20 + co * 0.15 + b * 0.15 + ai * 0.10;
  }

  it('known inputs: concept=80 speed=70 consistency=90 behavior=100 ai=100 → 84.5', () => {
    expect(composite(80, 70, 90, 100, 100)).toBeCloseTo(84.5, 1);
  });

  it('zero concept score caps composite below 70 even with perfect other scores', () => {
    expect(composite(0, 100, 100, 100, 100)).toBeLessThan(70);
  });

  it('all 100s → composite 100', () => {
    expect(composite(100, 100, 100, 100, 100)).toBeCloseTo(100, 1);
  });

  it('composite >= 70 → should certify', () => {
    expect(composite(80, 70, 90, 100, 100)).toBeGreaterThanOrEqual(70);
  });

  it('composite < 70 → no certificate', () => {
    expect(composite(50, 50, 50, 50, 50)).toBeLessThan(70);
  });
});

// ── retakeAfterDays ───────────────────────────────────────────────────────────
describe('retakeAfterDays', () => {
  function retakeDays(score: number): number {
    if (score >= 70) return 0;
    if (score >= 50) return 7;
    return 14;
  }

  it('passing score → 0 days', () => { expect(retakeDays(75)).toBe(0); });
  it('partial (50-69) → 7 days',  () => { expect(retakeDays(60)).toBe(7); });
  it('fail (<50) → 14 days',       () => { expect(retakeDays(30)).toBe(14); });
  it('exactly 70 → 0 days',        () => { expect(retakeDays(70)).toBe(0); });
  it('exactly 50 → 7 days',        () => { expect(retakeDays(50)).toBe(7); });
  it('exactly 49 → 14 days',       () => { expect(retakeDays(49)).toBe(14); });
});

// ── Speed score formula ───────────────────────────────────────────────────────
describe('Speed score calculation', () => {
  function speedScore(timeTakenSec: number, baselineSec: number): number {
    return Math.max(0, 1 - (timeTakenSec / baselineSec));
  }

  it('answering at exactly baseline speed → score 0', () => {
    expect(speedScore(10, 10)).toBeCloseTo(0, 2);
  });

  it('answering at half baseline → score 0.5', () => {
    expect(speedScore(5, 10)).toBeCloseTo(0.5, 2);
  });

  it('answering instantly → score 1', () => {
    expect(speedScore(0, 10)).toBeCloseTo(1, 2);
  });

  it('answering over baseline → clamped to 0', () => {
    expect(speedScore(20, 10)).toBe(0);
  });
});

// ── Certificate hash verification ────────────────────────────────────────────
describe('verifyCertificateHash', () => {
  const crypto = require('crypto');

  function makeCertHash(sessionId: string, score: number, issuedAt: string): string {
    return crypto.createHash('sha256')
      .update(`${sessionId}:${score}:${issuedAt}`)
      .digest('hex');
  }

  function verifyCertHash(sessionId: string, score: number, issuedAt: string, hash: string): boolean {
    const expected = makeCertHash(sessionId, score, issuedAt);
    return expected === hash;
  }

  it('valid inputs → true', () => {
    const sid = 'sess-abc-123';
    const score = 82.5;
    const issuedAt = '2025-01-01T00:00:00.000Z';
    const hash = makeCertHash(sid, score, issuedAt);
    expect(verifyCertHash(sid, score, issuedAt, hash)).toBe(true);
  });

  it('tampered score → false', () => {
    const sid = 'sess-abc-123';
    const issuedAt = '2025-01-01T00:00:00.000Z';
    const hash = makeCertHash(sid, 82.5, issuedAt);
    expect(verifyCertHash(sid, 99, issuedAt, hash)).toBe(false);
  });

  it('empty hash → false', () => {
    expect(verifyCertHash('sid', 80, '2025-01-01T00:00:00.000Z', '')).toBe(false);
  });
});

// ── Behavior score deductions ─────────────────────────────────────────────────
describe('Behavior score deductions', () => {
  function behaviorScore(strikes: number, pasteAttempts: number): number {
    let score = 100;
    if (strikes >= 2) score -= 10;
    score -= pasteAttempts * 5;
    return Math.max(0, score);
  }

  it('no violations → 100', () => { expect(behaviorScore(0, 0)).toBe(100); });
  it('1 strike → 100 (warning only, no deduction)', () => { expect(behaviorScore(1, 0)).toBe(100); });
  it('2 strikes → 90', () => { expect(behaviorScore(2, 0)).toBe(90); });
  it('1 paste attempt → 95', () => { expect(behaviorScore(0, 1)).toBe(95); });
  it('2 paste attempts + 2 strikes → 80', () => { expect(behaviorScore(2, 2)).toBe(80); });
  it('score never goes below 0', () => { expect(behaviorScore(2, 30)).toBe(0); });
});

// ── AI authenticity score ─────────────────────────────────────────────────────
describe('AI authenticity score', () => {
  function aiAuthScore(aiProbability: number): number {
    return (1 - aiProbability) * 100;
  }

  it('no AI detected → 100', () => { expect(aiAuthScore(0)).toBe(100); });
  it('50% AI probability → 50', () => { expect(aiAuthScore(0.5)).toBe(50); });
  it('high AI probability → low score', () => { expect(aiAuthScore(0.9)).toBeCloseTo(10, 1); });
});
