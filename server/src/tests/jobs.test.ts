// jobs.test.ts — pure-logic job board and feed algorithm tests

jest.mock('../config/redis', () => ({ getRedis: jest.fn() }));
jest.mock('../config/database', () => ({ connectDB: jest.fn() }));
jest.mock('../services/email.service', () => ({
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

// ── Feed score algorithm ──────────────────────────────────────────────────────
describe('Feed ranking algorithm', () => {
  function feedScore(opts: {
    hoursAge: number;
    likes: number;
    comments: number;
    reposts: number;
    relationshipWeight: number;
    verifiedBonus: number;
    certBonus: number;
  }): number {
    const recency = Math.exp(-0.5 * opts.hoursAge);
    const engagement = Math.min((opts.likes + opts.comments * 2 + opts.reposts * 3) / 100, 1);
    return recency * engagement * opts.relationshipWeight * opts.verifiedBonus * opts.certBonus;
  }

  const BASE = { hoursAge: 1, likes: 10, comments: 5, reposts: 2, relationshipWeight: 2.0, verifiedBonus: 1.25, certBonus: 1.0 };

  it('newer posts score higher', () => {
    const newer = feedScore({ ...BASE, hoursAge: 1 });
    const older  = feedScore({ ...BASE, hoursAge: 24 });
    expect(newer).toBeGreaterThan(older);
  });

  it('more engagement scores higher', () => {
    const high = feedScore({ ...BASE, likes: 50, comments: 20, reposts: 10 });
    const low  = feedScore({ ...BASE, likes: 1,  comments: 0,  reposts: 0 });
    expect(high).toBeGreaterThan(low);
  });

  it('1st degree connection scores higher than following', () => {
    const first   = feedScore({ ...BASE, relationshipWeight: 2.0 });
    const follows = feedScore({ ...BASE, relationshipWeight: 1.0 });
    expect(first).toBeGreaterThan(follows);
  });

  it('verified author bonus applied', () => {
    const verified   = feedScore({ ...BASE, verifiedBonus: 1.25 });
    const unverified = feedScore({ ...BASE, verifiedBonus: 1.0 });
    expect(verified).toBeGreaterThan(unverified);
  });

  it('cert announcement gets extra boost', () => {
    const cert   = feedScore({ ...BASE, certBonus: 1.5 });
    const normal = feedScore({ ...BASE, certBonus: 1.0 });
    expect(cert).toBeGreaterThan(normal);
  });

  it('engagement capped at 1 (no runaway scores)', () => {
    // 999 likes would give engagement > 1 without the cap
    const score = feedScore({ ...BASE, likes: 999, comments: 0, reposts: 0 });
    const recency = Math.exp(-0.5 * BASE.hoursAge);
    const maxPossible = recency * 1 * BASE.relationshipWeight * BASE.verifiedBonus * BASE.certBonus;
    expect(score).toBeLessThanOrEqual(maxPossible + 0.0001);
  });
});

// ── Job salary filter ─────────────────────────────────────────────────────────
describe('Job salary filtering', () => {
  interface MockJob { title: string; salaryMin: number; salaryMax: number }

  function filterBySalary(jobs: MockJob[], minSalary: number): MockJob[] {
    return jobs.filter(j => j.salaryMax >= minSalary);
  }

  const JOBS: MockJob[] = [
    { title: 'Junior Dev',   salaryMin: 40_000, salaryMax: 60_000 },
    { title: 'Mid Dev',      salaryMin: 70_000, salaryMax: 90_000 },
    { title: 'Senior Dev',   salaryMin: 100_000, salaryMax: 130_000 },
  ];

  it('filter by 70k shows mid and senior', () => {
    const r = filterBySalary(JOBS, 70_000);
    expect(r.map(j => j.title)).toEqual(['Mid Dev', 'Senior Dev']);
  });

  it('filter by 0 shows all', () => {
    expect(filterBySalary(JOBS, 0)).toHaveLength(3);
  });

  it('filter by 200k shows none', () => {
    expect(filterBySalary(JOBS, 200_000)).toHaveLength(0);
  });
});

// ── Job skill requirement matching ────────────────────────────────────────────
describe('Job skill badge status', () => {
  type SkillStatus = 'verified' | 'unverified' | 'missing';

  function getCandidateSkillStatus(
    candidateSkills: { skillId: string; status: string }[],
    jobSkill: { skillId: string; tier: string }
  ): SkillStatus {
    const match = candidateSkills.find(s => s.skillId === jobSkill.skillId);
    if (!match) return 'missing';
    return match.status === 'verified' ? 'verified' : 'unverified';
  }

  const SKILLS = [
    { skillId: 'react', status: 'verified' },
    { skillId: 'node', status: 'unverified' },
  ];

  it('verified skill → verified', () => {
    expect(getCandidateSkillStatus(SKILLS, { skillId: 'react', tier: 'mid' })).toBe('verified');
  });

  it('unverified skill → unverified', () => {
    expect(getCandidateSkillStatus(SKILLS, { skillId: 'node', tier: 'mid' })).toBe('unverified');
  });

  it('missing skill → missing', () => {
    expect(getCandidateSkillStatus(SKILLS, { skillId: 'python', tier: 'mid' })).toBe('missing');
  });
});

// ── Profile completeness scoring ──────────────────────────────────────────────
describe('Profile completeness score', () => {
  interface Profile {
    profilePhoto: string;
    headline: string;
    experience: unknown[];
    education: unknown[];
    verifiedSkills: number;
    summary: string;
    links: unknown[];
    connections: unknown[];
  }

  function completeness(p: Profile): number {
    let score = 0;
    if (p.profilePhoto)             score += 10;
    if (p.headline.length > 0)      score += 10;
    if (p.experience.length >= 1)   score += 15;
    if (p.education.length >= 1)    score += 10;
    if (p.verifiedSkills >= 1)      score += 20;
    if (p.verifiedSkills >= 3)      score += 10;
    if (p.summary.length >= 100)    score += 10;
    if (p.links.length >= 1)        score += 5;
    if (p.connections.length >= 5)  score += 10;
    return score;
  }

  it('empty profile → 0', () => {
    expect(completeness({ profilePhoto:'', headline:'', experience:[], education:[], verifiedSkills:0, summary:'', links:[], connections:[] })).toBe(0);
  });

  it('fully complete profile → 100', () => {
    expect(completeness({
      profilePhoto: 'photo.jpg',
      headline: 'Dev',
      experience: [{}],
      education: [{}],
      verifiedSkills: 3,
      summary: 'x'.repeat(100),
      links: ['link'],
      connections: [{},{},{},{},{}],
    })).toBe(100);
  });

  it('1 verified skill gives 20 pts, not 30', () => {
    const p = { profilePhoto:'', headline:'', experience:[], education:[], verifiedSkills:1, summary:'', links:[], connections:[] };
    expect(completeness(p)).toBe(20);
  });

  it('3+ verified skills gives 30 pts', () => {
    const p = { profilePhoto:'', headline:'', experience:[], education:[], verifiedSkills:3, summary:'', links:[], connections:[] };
    expect(completeness(p)).toBe(30);
  });
});
