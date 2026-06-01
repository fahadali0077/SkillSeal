// connections.test.ts — pure-logic connection system tests

jest.mock('../config/redis', () => ({ getRedis: jest.fn() }));
jest.mock('../config/database', () => ({ connectDB: jest.fn() }));
jest.mock('../services/email.service', () => ({
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

// ── Connection status logic ───────────────────────────────────────────────────
describe('Connection status resolution', () => {
  type ConnStatus = 'accepted' | 'pending' | 'declined' | 'withdrawn' | 'none';

  interface MockConn {
    requesterId: string;
    recipientId: string;
    status: ConnStatus;
  }

  function resolveStatus(viewerId: string, targetId: string, conns: MockConn[]): string {
    const conn = conns.find(
      c => (c.requesterId === viewerId && c.recipientId === targetId) ||
           (c.requesterId === targetId && c.recipientId === viewerId)
    );
    if (!conn) return 'none';
    return conn.status;
  }

  const CONNS: MockConn[] = [
    { requesterId: 'alice', recipientId: 'bob', status: 'accepted' },
    { requesterId: 'alice', recipientId: 'carol', status: 'pending' },
    { requesterId: 'dave', recipientId: 'alice', status: 'declined' },
  ];

  it('connected users → accepted', () => {
    expect(resolveStatus('alice', 'bob', CONNS)).toBe('accepted');
  });

  it('reverse lookup works too', () => {
    expect(resolveStatus('bob', 'alice', CONNS)).toBe('accepted');
  });

  it('pending request → pending', () => {
    expect(resolveStatus('alice', 'carol', CONNS)).toBe('pending');
  });

  it('declined request → declined', () => {
    expect(resolveStatus('alice', 'dave', CONNS)).toBe('declined');
  });

  it('no connection → none', () => {
    expect(resolveStatus('alice', 'zara', CONNS)).toBe('none');
  });
});

// ── Request validation ────────────────────────────────────────────────────────
describe('Connection request validation', () => {
  function canSendRequest(
    senderId: string,
    recipientId: string,
    opts: { alreadyConnected: boolean; isBlocked: boolean; isSelf: boolean; weeklyCount: number }
  ): { allowed: boolean; errorCode?: string } {
    if (opts.isSelf)            return { allowed: false, errorCode: 'SELF_REQUEST' };
    if (opts.isBlocked)         return { allowed: false, errorCode: 'BLOCKED' };
    if (opts.alreadyConnected)  return { allowed: false, errorCode: 'ALREADY_CONNECTED' };
    if (opts.weeklyCount >= 100) return { allowed: false, errorCode: 'WEEKLY_LIMIT_EXCEEDED' };
    return { allowed: true };
  }

  it('valid request is allowed', () => {
    expect(canSendRequest('a','b',{ alreadyConnected:false, isBlocked:false, isSelf:false, weeklyCount:5 }).allowed).toBe(true);
  });

  it('self-request rejected', () => {
    const r = canSendRequest('a','a',{ alreadyConnected:false, isBlocked:false, isSelf:true, weeklyCount:0 });
    expect(r.allowed).toBe(false);
    expect(r.errorCode).toBe('SELF_REQUEST');
  });

  it('blocked user rejected', () => {
    const r = canSendRequest('a','b',{ alreadyConnected:false, isBlocked:true, isSelf:false, weeklyCount:0 });
    expect(r.errorCode).toBe('BLOCKED');
  });

  it('already connected rejected', () => {
    const r = canSendRequest('a','b',{ alreadyConnected:true, isBlocked:false, isSelf:false, weeklyCount:0 });
    expect(r.errorCode).toBe('ALREADY_CONNECTED');
  });

  it('100th request this week hits limit', () => {
    const r = canSendRequest('a','b',{ alreadyConnected:false, isBlocked:false, isSelf:false, weeklyCount:100 });
    expect(r.errorCode).toBe('WEEKLY_LIMIT_EXCEEDED');
  });

  it('99th request this week is still allowed', () => {
    const r = canSendRequest('a','b',{ alreadyConnected:false, isBlocked:false, isSelf:false, weeklyCount:99 });
    expect(r.allowed).toBe(true);
  });
});

// ── Connection degree calculation ─────────────────────────────────────────────
describe('Connection degree calculation', () => {
  type Graph = Record<string, string[]>;

  function getDegree(viewerId: string, targetId: string, graph: Graph): '1st' | '2nd' | '3rd' | 'none' {
    if (viewerId === targetId) return '1st';
    const firstDegree = graph[viewerId] ?? [];
    if (firstDegree.includes(targetId)) return '1st';
    for (const mid of firstDegree) {
      if ((graph[mid] ?? []).includes(targetId)) return '2nd';
    }
    for (const mid of firstDegree) {
      for (const far of (graph[mid] ?? [])) {
        if ((graph[far] ?? []).includes(targetId)) return '3rd';
      }
    }
    return 'none';
  }

  const GRAPH: Graph = {
    alice: ['bob', 'carol'],
    bob:   ['alice', 'dave'],
    carol: ['alice'],
    dave:  ['bob', 'eve'],
    eve:   ['dave', 'frank'],
    frank: ['eve'],
  };

  it('direct connection → 1st', () => { expect(getDegree('alice', 'bob', GRAPH)).toBe('1st'); });
  it('connection of connection → 2nd', () => { expect(getDegree('alice', 'dave', GRAPH)).toBe('2nd'); });
  it('3 hops → 3rd', () => { expect(getDegree('alice', 'eve', GRAPH)).toBe('3rd'); });
  it('unconnected → none', () => { expect(getDegree('alice', 'frank', GRAPH)).toBe('none'); });
  it('reverse 1st degree works', () => { expect(getDegree('bob', 'alice', GRAPH)).toBe('1st'); });
});

// ── People You May Know scoring ───────────────────────────────────────────────
describe('PYMK scoring algorithm', () => {
  interface PYMKCandidate {
    mutualConnections: number;
    sameEmployer: boolean;
    sameEducation: boolean;
    sameVerifiedSkillTier: boolean;
    viewedMe: boolean;
    sameCity: boolean;
  }

  function scorePYMK(c: PYMKCandidate): number {
    return (
      Math.min(c.mutualConnections * 5, 25) +
      (c.sameEmployer ? 15 : 0) +
      (c.sameEducation ? 10 : 0) +
      (c.sameVerifiedSkillTier ? 8 : 0) +
      (c.viewedMe ? 12 : 0) +
      (c.sameCity ? 5 : 0)
    );
  }

  it('same employer is highest single signal', () => {
    const emp = scorePYMK({ mutualConnections:0, sameEmployer:true, sameEducation:false, sameVerifiedSkillTier:false, viewedMe:false, sameCity:false });
    const edu = scorePYMK({ mutualConnections:0, sameEmployer:false, sameEducation:true, sameVerifiedSkillTier:false, viewedMe:false, sameCity:false });
    expect(emp).toBeGreaterThan(edu);
  });

  it('mutual connections capped at 5 (25 pts)', () => {
    const s1 = scorePYMK({ mutualConnections:5, sameEmployer:false, sameEducation:false, sameVerifiedSkillTier:false, viewedMe:false, sameCity:false });
    const s2 = scorePYMK({ mutualConnections:99, sameEmployer:false, sameEducation:false, sameVerifiedSkillTier:false, viewedMe:false, sameCity:false });
    expect(s1).toBe(s2);
    expect(s1).toBe(25);
  });

  it('all signals combine correctly', () => {
    const s = scorePYMK({ mutualConnections:3, sameEmployer:true, sameEducation:true, sameVerifiedSkillTier:true, viewedMe:true, sameCity:true });
    expect(s).toBe(3*5 + 15 + 10 + 8 + 12 + 5); // 65
  });

  it('zero signals → score 0', () => {
    expect(scorePYMK({ mutualConnections:0, sameEmployer:false, sameEducation:false, sameVerifiedSkillTier:false, viewedMe:false, sameCity:false })).toBe(0);
  });
});
