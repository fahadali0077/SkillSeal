// ─────────────────────────────────────────────────────────────────────────────
// admin.test.ts
//
// AUDIT §3 / §5: admin.service.ts is the highest-privilege surface in the app
// (user suspension, role changes, deletion, certificate revocation) and had zero
// test coverage. The self-protection guards described in the audit's "what's
// done well" section were correct at review time, but nothing would have caught
// a regression.
//
// These tests mock the Mongoose models rather than using mongodb-memory-server,
// so they exercise the guard logic and run in any environment — including CI
// without a database, which is where the existing DB-dependent tests degrade to
// no-ops.
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('../config/redis', () => ({ getRedis: jest.fn() }));
jest.mock('../config/database', () => ({ connectDB: jest.fn() }));
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockUser = {
  findById: jest.fn(),
  updateOne: jest.fn().mockResolvedValue({}),
  countDocuments: jest.fn().mockResolvedValue(0),
};
const mockVerification = { findById: jest.fn(), updateOne: jest.fn().mockResolvedValue({}) };

jest.mock('../models/User.model', () => ({ User: mockUser }));
jest.mock('../models/Verification.model', () => ({ Verification: mockVerification }));
jest.mock('../models/Session.model', () => ({ Session: { countDocuments: jest.fn() } }));
jest.mock('../models/Skill.model', () => ({ Skill: { find: jest.fn() } }));
jest.mock('../models/Job.model', () => ({ Job: { find: jest.fn() } }));
jest.mock('../models/Post.model', () => ({ Post: { find: jest.fn() } }));

import {
  updateUserRole, suspendUser, deleteUser, revokeVerification, reactivateUser,
} from '../services/admin.service';

const ADMIN_ID = '507f1f77bcf86cd799439011';
const OTHER_ID = '507f1f77bcf86cd799439012';
const BAD_ID = 'not-a-valid-object-id';

/** A saveable stand-in for a Mongoose user document. */
function fakeUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => OTHER_ID },
    email: 'user@example.com',
    firstName: 'Test', lastName: 'User',
    role: 'candidate', status: 'active',
    tokenVersion: 0,
    suspendedReason: '', suspendedAt: null,
    createdAt: new Date(), skills: [],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser.updateOne.mockResolvedValue({});
});

// ── Self-protection: an admin cannot act on their own account ────────────────
describe('admin self-protection guards', () => {
  it('refuses to change own role', async () => {
    await expect(updateUserRole(ADMIN_ID, ADMIN_ID, 'candidate'))
      .rejects.toThrow(/cannot change your own role/i);
    expect(mockUser.findById).not.toHaveBeenCalled();
  });

  it('refuses to suspend own account', async () => {
    await expect(suspendUser(ADMIN_ID, ADMIN_ID, 'reason'))
      .rejects.toThrow(/cannot suspend your own account/i);
    expect(mockUser.findById).not.toHaveBeenCalled();
  });

  it('refuses to delete own account', async () => {
    await expect(deleteUser(ADMIN_ID, ADMIN_ID))
      .rejects.toThrow(/cannot delete your own account/i);
    expect(mockUser.findById).not.toHaveBeenCalled();
  });
});

// ── Peer protection: admins cannot act on other platform admins ──────────────
describe('platform_admin peer protection', () => {
  it('refuses to suspend another platform admin', async () => {
    const target = fakeUser({ role: 'platform_admin' });
    mockUser.findById.mockResolvedValue(target);
    await expect(suspendUser(ADMIN_ID, OTHER_ID, 'reason'))
      .rejects.toThrow(/cannot suspend another platform admin/i);
    expect(target.save).not.toHaveBeenCalled();
  });

  it('refuses to delete another platform admin', async () => {
    const target = fakeUser({ role: 'platform_admin' });
    mockUser.findById.mockResolvedValue(target);
    await expect(deleteUser(ADMIN_ID, OTHER_ID))
      .rejects.toThrow(/cannot delete another platform admin/i);
  });

  it('does allow suspending a non-admin user', async () => {
    const target = fakeUser({ role: 'candidate' });
    mockUser.findById.mockResolvedValue(target);
    await suspendUser(ADMIN_ID, OTHER_ID, 'spamming');
    expect(target.status).toBe('suspended');
    expect(target.save).toHaveBeenCalled();
  });
});

// ── Session invalidation on privilege change ─────────────────────────────────
describe('tokenVersion invalidation', () => {
  it('bumps tokenVersion on role change so old tokens stop working', async () => {
    const target = fakeUser({ tokenVersion: 3 });
    mockUser.findById.mockResolvedValue(target);
    await updateUserRole(ADMIN_ID, OTHER_ID, 'recruiter');
    expect(target.role).toBe('recruiter');
    expect(target.tokenVersion).toBe(4);
  });

  it('bumps tokenVersion on suspension so active sessions are killed', async () => {
    const target = fakeUser({ tokenVersion: 7 });
    mockUser.findById.mockResolvedValue(target);
    await suspendUser(ADMIN_ID, OTHER_ID, 'abuse');
    expect(target.tokenVersion).toBe(8);
  });
});

// ── Input validation ─────────────────────────────────────────────────────────
describe('admin input validation', () => {
  it('rejects an invalid ObjectId before touching the database', async () => {
    await expect(suspendUser(ADMIN_ID, BAD_ID, 'x')).rejects.toThrow(/invalid userid/i);
    expect(mockUser.findById).not.toHaveBeenCalled();
  });

  it('rejects a role outside the assignable set', async () => {
    await expect(updateUserRole(ADMIN_ID, OTHER_ID, 'superuser'))
      .rejects.toThrow(/invalid role/i);
    expect(mockUser.findById).not.toHaveBeenCalled();
  });

  it('accepts every documented assignable role', async () => {
    for (const role of ['candidate', 'recruiter', 'company_admin', 'platform_admin']) {
      const target = fakeUser();
      mockUser.findById.mockResolvedValue(target);
      await expect(updateUserRole(ADMIN_ID, OTHER_ID, role)).resolves.toBeDefined();
      expect(target.role).toBe(role);
    }
  });

  it('404s on a missing user rather than failing silently', async () => {
    mockUser.findById.mockResolvedValue(null);
    await expect(suspendUser(ADMIN_ID, OTHER_ID, 'x')).rejects.toThrow(/user not found/i);
  });

  it('truncates an oversized suspension reason to 500 chars', async () => {
    const target = fakeUser();
    mockUser.findById.mockResolvedValue(target);
    await suspendUser(ADMIN_ID, OTHER_ID, 'x'.repeat(5000));
    expect((target.suspendedReason as string).length).toBe(500);
  });
});

// ── Reactivation clears the suspension record ────────────────────────────────
describe('reactivateUser', () => {
  it('clears status, reason and timestamp', async () => {
    const target = fakeUser({ status: 'suspended', suspendedReason: 'spam', suspendedAt: new Date() });
    mockUser.findById.mockResolvedValue(target);
    await reactivateUser(ADMIN_ID, OTHER_ID);
    expect(target.status).toBe('active');
    expect(target.suspendedReason).toBe('');
    expect(target.suspendedAt).toBeNull();
  });
});

// ── Certificate revocation ───────────────────────────────────────────────────
describe('revokeVerification', () => {
  function fakeVerification(overrides: Record<string, unknown> = {}) {
    return {
      _id: { toString: () => OTHER_ID },
      userId: { toString: () => ADMIN_ID },
      skillId: { toString: () => 'skill-1' },
      sessionId: { toString: () => 'sess-1' },
      tier: 'advanced', compositeScore: 91, aiProbability: 0.02,
      status: 'VERIFIED', flagReason: '', certificateId: 'SKL-1',
      issuedAt: new Date(), expiresAt: new Date(),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('marks the verification revoked and records a default reason', async () => {
    const v = fakeVerification();
    mockVerification.findById.mockResolvedValue(v);
    const row = await revokeVerification(ADMIN_ID, OTHER_ID, '');
    expect(v.status).toBe('REVOKED');
    expect(v.flagReason).toMatch(/revoked by administrator/i);
    expect(row.status).toBe('REVOKED');
  });

  it('refuses to revoke an already-revoked certificate', async () => {
    mockVerification.findById.mockResolvedValue(fakeVerification({ status: 'REVOKED' }));
    await expect(revokeVerification(ADMIN_ID, OTHER_ID, 'x'))
      .rejects.toThrow(/already revoked/i);
  });

  it('flags the embedded skill and pulls it from the recruiter-facing summary', async () => {
    mockVerification.findById.mockResolvedValue(fakeVerification());
    await revokeVerification(ADMIN_ID, OTHER_ID, 'cheating');
    const ops = mockUser.updateOne.mock.calls.map((c) => JSON.stringify(c[1]));
    expect(ops.some((o) => o.includes('flagged'))).toBe(true);
    expect(ops.some((o) => o.includes('$pull'))).toBe(true);
  });

  it('404s on a missing verification', async () => {
    mockVerification.findById.mockResolvedValue(null);
    await expect(revokeVerification(ADMIN_ID, OTHER_ID, 'x'))
      .rejects.toThrow(/verification not found/i);
  });

  it('rejects an invalid verification id before touching the database', async () => {
    await expect(revokeVerification(ADMIN_ID, BAD_ID, 'x'))
      .rejects.toThrow(/invalid verificationid/i);
    expect(mockVerification.findById).not.toHaveBeenCalled();
  });
});
