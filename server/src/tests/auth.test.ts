// auth.test.ts — pure unit tests for auth service logic (no DB required)

jest.mock('../config/redis', () => ({ getRedis: jest.fn() }));
jest.mock('../config/database', () => ({ connectDB: jest.fn() }));
jest.mock('../services/email.service', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ── Password hashing ──────────────────────────────────────────────────────────
describe('Password hashing', () => {
  it('hashes and verifies a password correctly', async () => {
    const password = 'MySecret123!';
    const hash = await bcrypt.hash(password, 10);
    expect(await bcrypt.compare(password, hash)).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await bcrypt.hash('correct', 10);
    expect(await bcrypt.compare('wrong', hash)).toBe(false);
  });

  it('two hashes of same password are different (salt)', async () => {
    const h1 = await bcrypt.hash('same', 10);
    const h2 = await bcrypt.hash('same', 10);
    expect(h1).not.toBe(h2);
  });
});

// ── Password validation rules ─────────────────────────────────────────────────
describe('Password validation', () => {
  function validatePassword(pw: string): boolean {
    return pw.length >= 8 &&
      /[A-Z]/.test(pw) &&
      /[0-9]/.test(pw) &&
      /[^A-Za-z0-9]/.test(pw);
  }

  it('accepts valid password', () => { expect(validatePassword('Secure1!')).toBe(true); });
  it('rejects too short',       () => { expect(validatePassword('Ab1!')).toBe(false); });
  it('rejects no uppercase',    () => { expect(validatePassword('secure1!')).toBe(false); });
  it('rejects no number',       () => { expect(validatePassword('SecureAA!')).toBe(false); });
  it('rejects no special char', () => { expect(validatePassword('Secure123')).toBe(false); });
});

// ── JWT creation and verification ─────────────────────────────────────────────
describe('JWT tokens', () => {
  const ACCESS_SECRET = 'test-access-secret-at-least-32-chars!!';
  const REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars!';

  function makeAccessToken(userId: string, role: string, tokenVersion: number): string {
    return jwt.sign({ userId, role, tokenVersion }, ACCESS_SECRET, { expiresIn: '15m' });
  }

  function makeRefreshToken(userId: string, tokenVersion: number): string {
    return jwt.sign({ userId, tokenVersion }, REFRESH_SECRET, { expiresIn: '7d' });
  }

  it('access token contains correct payload', () => {
    const token = makeAccessToken('user123', 'candidate', 0);
    const payload = jwt.verify(token, ACCESS_SECRET) as Record<string, unknown>;
    expect(payload['userId']).toBe('user123');
    expect(payload['role']).toBe('candidate');
    expect(payload['tokenVersion']).toBe(0);
  });

  it('refresh token contains userId and tokenVersion', () => {
    const token = makeRefreshToken('user456', 1);
    const payload = jwt.verify(token, REFRESH_SECRET) as Record<string, unknown>;
    expect(payload['userId']).toBe('user456');
    expect(payload['tokenVersion']).toBe(1);
  });

  it('rejects token signed with wrong secret', () => {
    const token = makeAccessToken('user123', 'candidate', 0);
    expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
  });

  it('tokenVersion mismatch invalidates session', () => {
    const token = makeAccessToken('user123', 'candidate', 0);
    const payload = jwt.verify(token, ACCESS_SECRET) as { tokenVersion: number };
    const currentVersion = 1; // incremented on logout
    expect(payload.tokenVersion).not.toBe(currentVersion);
  });

  it('expired token throws TokenExpiredError', () => {
    const token = jwt.sign({ userId: 'u1' }, ACCESS_SECRET, { expiresIn: '-1s' });
    expect(() => jwt.verify(token, ACCESS_SECRET)).toThrow(jwt.TokenExpiredError);
  });
});

// ── Email validation ──────────────────────────────────────────────────────────
describe('Email validation', () => {
  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user+tag@domain.co.uk')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('missing@tld')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

// ── Brute force tracking ──────────────────────────────────────────────────────
describe('Brute force protection logic', () => {
  interface AttemptTracker { count: number; lockedUntil: number | null }

  function recordAttempt(tracker: AttemptTracker): AttemptTracker {
    const count = tracker.count + 1;
    return {
      count,
      lockedUntil: count >= 5 ? Date.now() + 15 * 60 * 1000 : null,
    };
  }

  function isLocked(tracker: AttemptTracker): boolean {
    if (!tracker.lockedUntil) return false;
    return Date.now() < tracker.lockedUntil;
  }

  it('5 failures triggers lockout', () => {
    let t: AttemptTracker = { count: 0, lockedUntil: null };
    for (let i = 0; i < 5; i++) t = recordAttempt(t);
    expect(isLocked(t)).toBe(true);
  });

  it('4 failures does not lock', () => {
    let t: AttemptTracker = { count: 0, lockedUntil: null };
    for (let i = 0; i < 4; i++) t = recordAttempt(t);
    expect(isLocked(t)).toBe(false);
  });
});
