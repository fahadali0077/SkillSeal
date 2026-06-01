// certificate.test.ts — pure-logic certificate integrity tests

jest.mock('../config/redis', () => ({ getRedis: jest.fn() }));
jest.mock('../config/database', () => ({ connectDB: jest.fn() }));
jest.mock('../services/email.service', () => ({
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

import crypto from 'crypto';

// ── Certificate ID format ─────────────────────────────────────────────────────
describe('Certificate ID generation', () => {
  function generateCertId(year: number, dayOfYear: number): string {
    const hex = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `SkillSeal-${hex}-${year}-${dayOfYear}`;
  }

  it('matches expected format SkillSeal-XXXX-YEAR-DAY', () => {
    const id = generateCertId(2025, 45);
    expect(id).toMatch(/^SkillSeal-[A-F0-9]{4}-\d{4}-\d+$/);
  });

  it('is unique across generations', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateCertId(2025, 1)));
    expect(ids.size).toBeGreaterThan(90); // allow tiny collision chance
  });

  it('contains the correct year', () => {
    const id = generateCertId(2026, 1);
    expect(id).toContain('-2026-');
  });
});

// ── Certificate hash integrity ────────────────────────────────────────────────
describe('Certificate hash integrity', () => {
  function makeCertHash(sessionId: string, score: number, issuedAt: string): string {
    return crypto.createHash('sha256')
      .update(`${sessionId}:${score}:${issuedAt}`)
      .digest('hex');
  }

  function verifyCertHash(sessionId: string, score: number, issuedAt: string, hash: string): boolean {
    return makeCertHash(sessionId, score, issuedAt) === hash;
  }

  const SESS = 'sess-abc-123';
  const SCORE = 82.5;
  const ISSUED = '2025-01-01T00:00:00.000Z';

  it('valid inputs return true', () => {
    const hash = makeCertHash(SESS, SCORE, ISSUED);
    expect(verifyCertHash(SESS, SCORE, ISSUED, hash)).toBe(true);
  });

  it('tampered score returns false', () => {
    const hash = makeCertHash(SESS, SCORE, ISSUED);
    expect(verifyCertHash(SESS, 99.9, ISSUED, hash)).toBe(false);
  });

  it('tampered sessionId returns false', () => {
    const hash = makeCertHash(SESS, SCORE, ISSUED);
    expect(verifyCertHash('different-session', SCORE, ISSUED, hash)).toBe(false);
  });

  it('tampered issuedAt returns false', () => {
    const hash = makeCertHash(SESS, SCORE, ISSUED);
    expect(verifyCertHash(SESS, SCORE, '2099-01-01T00:00:00.000Z', hash)).toBe(false);
  });

  it('empty hash returns false', () => {
    expect(verifyCertHash(SESS, SCORE, ISSUED, '')).toBe(false);
  });

  it('hash is exactly 64 hex characters (SHA-256)', () => {
    const hash = makeCertHash(SESS, SCORE, ISSUED);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ── Certificate expiry ────────────────────────────────────────────────────────
describe('Certificate expiry', () => {
  function getExpiresAt(issuedAt: Date): Date {
    const d = new Date(issuedAt);
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }

  function isCertExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  it('certificate expires exactly 1 year after issuance', () => {
    const issued = new Date('2025-01-15T00:00:00.000Z');
    const expires = getExpiresAt(issued);
    expect(expires.getFullYear()).toBe(2026);
    expect(expires.getMonth()).toBe(0); // January
    expect(expires.getDate()).toBe(15);
  });

  it('newly issued certificate is not expired', () => {
    const issued = new Date();
    const expires = getExpiresAt(issued);
    expect(isCertExpired(expires)).toBe(false);
  });

  it('certificate from 2 years ago is expired', () => {
    const issued = new Date();
    issued.setFullYear(issued.getFullYear() - 2);
    const expires = getExpiresAt(issued);
    expect(isCertExpired(expires)).toBe(true);
  });
});

// ── Tier thresholds ───────────────────────────────────────────────────────────
describe('Certification threshold logic', () => {
  function getCertStatus(score: number): 'verified' | 'partial' | 'not_certified' {
    if (score >= 70) return 'verified';
    if (score >= 50) return 'partial';
    return 'not_certified';
  }

  it('score 70 → verified', () => { expect(getCertStatus(70)).toBe('verified'); });
  it('score 85 → verified', () => { expect(getCertStatus(85)).toBe('verified'); });
  it('score 50 → partial', () => { expect(getCertStatus(50)).toBe('partial'); });
  it('score 69 → partial', () => { expect(getCertStatus(69)).toBe('partial'); });
  it('score 49 → not_certified', () => { expect(getCertStatus(49)).toBe('not_certified'); });
  it('score 0 → not_certified', () => { expect(getCertStatus(0)).toBe('not_certified'); });
});
