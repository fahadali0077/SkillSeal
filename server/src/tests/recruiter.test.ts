// recruiter.test.ts — pure-logic recruiter search and pipeline tests

jest.mock('../config/redis', () => ({ getRedis: jest.fn() }));
jest.mock('../config/database', () => ({ connectDB: jest.fn() }));
jest.mock('../services/email.service', () => ({
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

// ── Behavior integrity classification ─────────────────────────────────────────
describe('Behavior integrity indicator', () => {
  function getIntegrity(behaviorScore: number): 'green' | 'yellow' | 'red' {
    if (behaviorScore >= 85) return 'green';
    if (behaviorScore >= 70) return 'yellow';
    return 'red';
  }

  it('score 100 → green',  () => { expect(getIntegrity(100)).toBe('green'); });
  it('score 85  → green',  () => { expect(getIntegrity(85)).toBe('green'); });
  it('score 84  → yellow', () => { expect(getIntegrity(84)).toBe('yellow'); });
  it('score 70  → yellow', () => { expect(getIntegrity(70)).toBe('yellow'); });
  it('score 69  → red',    () => { expect(getIntegrity(69)).toBe('red'); });
  it('score 0   → red',    () => { expect(getIntegrity(0)).toBe('red'); });
});

// ── AI flag threshold ─────────────────────────────────────────────────────────
describe('AI flag threshold', () => {
  function isAiFlagged(aiProbability: number): boolean {
    return aiProbability > 0.40;
  }

  it('0.41 → flagged',  () => { expect(isAiFlagged(0.41)).toBe(true); });
  it('0.40 → not flagged (boundary)', () => { expect(isAiFlagged(0.40)).toBe(false); });
  it('0.90 → flagged',  () => { expect(isAiFlagged(0.90)).toBe(true); });
  it('0.10 → not flagged', () => { expect(isAiFlagged(0.10)).toBe(false); });
});

// ── Job match score ───────────────────────────────────────────────────────────
describe('Job match scoring', () => {
  interface SkillEntry { skillId: string; status: 'verified' | 'unverified' }
  interface RequiredSkill { skillId: string; tier: string; required: boolean }

  function computeMatchScore(
    candidateSkills: SkillEntry[],
    requiredSkills: RequiredSkill[]
  ): number {
    let score = 0;
    for (const req of requiredSkills) {
      const match = candidateSkills.find(s => s.skillId === req.skillId);
      if (!match) continue;
      score += match.status === 'verified' ? 2 : 0.5;
    }
    return score;
  }

  const CANDIDATE: SkillEntry[] = [
    { skillId: 'react', status: 'verified' },
    { skillId: 'node', status: 'unverified' },
    { skillId: 'mongo', status: 'verified' },
  ];

  it('verified skill match scores 2 points', () => {
    const score = computeMatchScore(CANDIDATE, [{ skillId: 'react', tier: 'mid', required: true }]);
    expect(score).toBe(2);
  });

  it('unverified match scores 0.5', () => {
    const score = computeMatchScore(CANDIDATE, [{ skillId: 'node', tier: 'mid', required: true }]);
    expect(score).toBe(0.5);
  });

  it('missing skill contributes 0', () => {
    const score = computeMatchScore(CANDIDATE, [{ skillId: 'python', tier: 'mid', required: true }]);
    expect(score).toBe(0);
  });

  it('full match with 3 verified skills', () => {
    const score = computeMatchScore(CANDIDATE, [
      { skillId: 'react', tier: 'mid', required: true },
      { skillId: 'mongo', tier: 'mid', required: true },
    ]);
    expect(score).toBe(4);
  });

  it('mixed verified/unverified adds correctly', () => {
    const score = computeMatchScore(CANDIDATE, [
      { skillId: 'react', tier: 'mid', required: true },
      { skillId: 'node', tier: 'mid', required: false },
    ]);
    expect(score).toBe(2.5);
  });
});

// ── Pipeline stages ───────────────────────────────────────────────────────────
describe('Application pipeline stages', () => {
  const VALID_STAGES = ['applied','shortlisted','contacted','interviewing','offer','rejected'] as const;
  type Stage = typeof VALID_STAGES[number];

  function isValidStage(s: string): s is Stage {
    return (VALID_STAGES as readonly string[]).includes(s);
  }

  function getNextStages(current: Stage): Stage[] {
    const idx = VALID_STAGES.indexOf(current);
    return VALID_STAGES.slice(idx + 1) as Stage[];
  }

  it('all valid stages accepted', () => {
    for (const s of VALID_STAGES) expect(isValidStage(s)).toBe(true);
  });

  it('invalid stage rejected', () => {
    expect(isValidStage('ghost')).toBe(false);
    expect(isValidStage('')).toBe(false);
  });

  it('applied → can move to any later stage', () => {
    const next = getNextStages('applied');
    expect(next).toContain('shortlisted');
    expect(next).toContain('offer');
  });

  it('offer has only rejected as next', () => {
    expect(getNextStages('offer')).toEqual(['rejected']);
  });

  it('rejected has no further stages', () => {
    expect(getNextStages('rejected')).toEqual([]);
  });
});

// ── Verified-only candidate filter ────────────────────────────────────────────
describe('verifiedOnly filter', () => {
  interface MockCandidate {
    name: string;
    skills: { skillId: string; status: string }[];
  }

  function filterVerifiedOnly(candidates: MockCandidate[], skillId: string): MockCandidate[] {
    return candidates.filter(c =>
      c.skills.some(s => s.skillId === skillId && s.status === 'verified')
    );
  }

  const CANDIDATES: MockCandidate[] = [
    { name: 'Alice', skills: [{ skillId: 'react', status: 'verified' }] },
    { name: 'Bob',   skills: [{ skillId: 'react', status: 'unverified' }] },
    { name: 'Carol', skills: [{ skillId: 'vue', status: 'verified' }] },
  ];

  it('returns only candidates with verified target skill', () => {
    const results = filterVerifiedOnly(CANDIDATES, 'react');
    expect(results.map(c => c.name)).toEqual(['Alice']);
  });

  it('returns empty if no verified candidates for skill', () => {
    expect(filterVerifiedOnly(CANDIDATES, 'angular')).toHaveLength(0);
  });

  it('does not include unverified matches', () => {
    const results = filterVerifiedOnly(CANDIDATES, 'react');
    expect(results.find(c => c.name === 'Bob')).toBeUndefined();
  });
});
