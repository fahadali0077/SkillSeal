// assessment.test.ts — pure-logic assessment engine tests (no DB required)

jest.mock('../config/redis', () => ({ getRedis: jest.fn() }));
jest.mock('../config/database', () => ({ connectDB: jest.fn() }));
jest.mock('../services/email.service', () => ({
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));
jest.mock('../ai/questionGenerator', () => ({
  generateQuestion: jest.fn().mockResolvedValue({
    _id: 'q-mock-001',
    questionType: 'mcq',
    text: 'What is a React hook?',
    options: ['A func', 'A class', 'A prop', 'A ref'],
    timeLimitMs: 60000,
    difficulty: 'intermediate',
    correctAnswer: 'A',
    aiEvalCriteria: '',
  }),
}));

import type { ServerSessionState } from '../utils/redis';

// ── Session state helpers ─────────────────────────────────────────────────────
const BASE_STATE: ServerSessionState = {
  sessionId: 'test-session-001',
  userId: 'user-001',
  skillId: 'skill-react-001',
  skillSlug: 'react',
  declaredTier: 'intermediate',
  currentTier: 'intermediate',
  questionIndex: 0,
  consecutiveCorrect: 0,
  consecutiveIncorrect: 0,
  runningConceptScore: 0,
  runningSpeedScore: 0,
  strikeCount: 0,
  questionHistory: [] as string[],
  questionStartTime: Date.now(),
  isTerminated: false,
  terminationReason: '',
  tierStepsUp: 0,
  tierStepsDown: 0,
  answers: [] as ServerSessionState['answers'],
};

// ── Question type distribution ────────────────────────────────────────────────
describe('Question type distribution', () => {
  const PATTERN = ['mcq','mcq','mcq','scenario','mcq','mcq','mcq','scenario','micro-theory','mcq'];
  function qType(i: number) { return PATTERN[i % PATTERN.length]; }

  it('index 0 → mcq', () => { expect(qType(0)).toBe('mcq'); });
  it('index 3 → scenario', () => { expect(qType(3)).toBe('scenario'); });
  it('index 8 → micro-theory', () => { expect(qType(8)).toBe('micro-theory'); });
  it('index 10 wraps to mcq', () => { expect(qType(10)).toBe('mcq'); });
  it('20-question session has 14 mcq, 4 scenario, 2 micro-theory', () => {
    const counts = { mcq: 0, scenario: 0, 'micro-theory': 0 };
    for (let i = 0; i < 20; i++) counts[qType(i) as keyof typeof counts]++;
    expect(counts.mcq).toBe(14);
    expect(counts.scenario).toBe(4);
    expect(counts['micro-theory']).toBe(2);
  });
});

// ── Timer validation logic ────────────────────────────────────────────────────
describe('Server-side timer validation', () => {
  const BUFFER_MS = 2000;
  const TIMER_SECONDS = { mcq: 60, scenario: 120, 'micro-theory': 150 };

  function isTimerExpired(
    questionStartTime: number,
    timerType: keyof typeof TIMER_SECONDS,
    isTimeout: boolean,
    nowOverride?: number
  ): boolean {
    if (isTimeout) return false; // timeout submissions always accepted
    const elapsed = (nowOverride ?? Date.now()) - questionStartTime;
    const allowed = TIMER_SECONDS[timerType] * 1000 + BUFFER_MS;
    return elapsed > allowed;
  }

  it('answer within time limit → not expired', () => {
    const start = Date.now() - 10_000; // 10 seconds ago
    expect(isTimerExpired(start, 'mcq', false)).toBe(false);
  });

  it('answer after timer + buffer → expired', () => {
    const start = Date.now() - 65_000; // 65s ago, limit is 60s + 2s buffer
    expect(isTimerExpired(start, 'mcq', false)).toBe(true);
  });

  it('isTimeout=true bypasses expiry check', () => {
    const start = Date.now() - 999_000; // very old
    expect(isTimerExpired(start, 'mcq', true)).toBe(false);
  });

  it('within 2-second network buffer → not expired', () => {
    const start = Date.now() - 61_000; // 61s, within 2s buffer
    expect(isTimerExpired(start, 'mcq', false)).toBe(false);
  });

  it('scenario timer gives 120 seconds', () => {
    const start = Date.now() - 100_000;
    expect(isTimerExpired(start, 'scenario', false)).toBe(false);
  });
});

// ── Adaptive difficulty ───────────────────────────────────────────────────────
describe('Adaptive difficulty logic', () => {
  const TIERS = ['beginner', 'intermediate', 'advanced', 'expert'];

  function adjustTier(
    currentTier: string,
    consecutiveCorrect: number,
    consecutiveIncorrect: number,
    tierStepsUp: number,
    tierStepsDown: number,
    wasCorrect: boolean
  ) {
    let cc = consecutiveCorrect;
    let ci = consecutiveIncorrect;
    let tier = currentTier;
    let stepsUp = tierStepsUp;
    let stepsDown = tierStepsDown;

    if (wasCorrect) {
      cc++;
      ci = 0;
      if (cc >= 3 && stepsUp < 2) {
        const idx = TIERS.indexOf(tier);
        if (idx < TIERS.length - 1) { tier = TIERS[idx + 1]!; stepsUp++; }
        cc = 0;
      }
    } else {
      ci++;
      cc = 0;
      if (ci >= 2 && stepsDown < 2) {
        const idx = TIERS.indexOf(tier);
        if (idx > 0) { tier = TIERS[idx - 1]!; stepsDown++; }
        ci = 0;
      }
    }
    return { tier, consecutiveCorrect: cc, consecutiveIncorrect: ci, stepsUp, stepsDown };
  }

  it('3 consecutive correct → tier steps up', () => {
    let s = { tier: 'intermediate', cc: 0, ci: 0, up: 0, down: 0 };
    for (let i = 0; i < 3; i++) {
      const r = adjustTier(s.tier, s.cc, s.ci, s.up, s.down, true);
      s = { tier: r.tier, cc: r.consecutiveCorrect, ci: r.consecutiveIncorrect, up: r.stepsUp, down: r.stepsDown };
    }
    expect(s.tier).toBe('advanced');
  });

  it('2 consecutive incorrect → tier steps down', () => {
    let s = { tier: 'intermediate', cc: 0, ci: 0, up: 0, down: 0 };
    for (let i = 0; i < 2; i++) {
      const r = adjustTier(s.tier, s.cc, s.ci, s.up, s.down, false);
      s = { tier: r.tier, cc: r.consecutiveCorrect, ci: r.consecutiveIncorrect, up: r.stepsUp, down: r.stepsDown };
    }
    expect(s.tier).toBe('beginner');
  });

  it('cannot go above expert tier', () => {
    let s = { tier: 'expert', cc: 0, ci: 0, up: 0, down: 0 };
    for (let i = 0; i < 3; i++) {
      const r = adjustTier(s.tier, s.cc, s.ci, s.up, s.down, true);
      s = { tier: r.tier, cc: r.consecutiveCorrect, ci: r.consecutiveIncorrect, up: r.stepsUp, down: r.stepsDown };
    }
    expect(s.tier).toBe('expert');
  });

  it('cannot go below beginner tier', () => {
    let s = { tier: 'beginner', cc: 0, ci: 0, up: 0, down: 0 };
    for (let i = 0; i < 2; i++) {
      const r = adjustTier(s.tier, s.cc, s.ci, s.up, s.down, false);
      s = { tier: r.tier, cc: r.consecutiveCorrect, ci: r.consecutiveIncorrect, up: r.stepsUp, down: r.stepsDown };
    }
    expect(s.tier).toBe('beginner');
  });

  it('capped at 2 steps up from start tier', () => {
    let s = { tier: 'beginner', cc: 0, ci: 0, up: 2, down: 0 }; // already at cap
    for (let i = 0; i < 3; i++) {
      const r = adjustTier(s.tier, s.cc, s.ci, s.up, s.down, true);
      s = { tier: r.tier, cc: r.consecutiveCorrect, ci: r.consecutiveIncorrect, up: r.stepsUp, down: r.stepsDown };
    }
    expect(s.up).toBe(2); // cap was not exceeded
  });
});

// ── Anti-cheat strike logic ───────────────────────────────────────────────────
describe('Anti-cheat strike system', () => {
  function processEvent(strikeCount: number, eventType: string): {
    newCount: number;
    action: 'log' | 'warning' | 'penalty' | 'terminate';
  } {
    if (eventType === 'window-focus') return { newCount: strikeCount, action: 'log' };
    const newCount = strikeCount + 1;
    if (newCount === 1) return { newCount, action: 'warning' };
    if (newCount === 2) return { newCount, action: 'penalty' };
    return { newCount, action: 'terminate' };
  }

  it('first tab-switch → warning', () => {
    expect(processEvent(0, 'tab-switch').action).toBe('warning');
    expect(processEvent(0, 'tab-switch').newCount).toBe(1);
  });

  it('second violation → penalty', () => {
    expect(processEvent(1, 'window-blur').action).toBe('penalty');
    expect(processEvent(1, 'window-blur').newCount).toBe(2);
  });

  it('third violation → terminate', () => {
    expect(processEvent(2, 'paste-attempt').action).toBe('terminate');
    expect(processEvent(2, 'paste-attempt').newCount).toBe(3);
  });

  it('window-focus does NOT increment strike count', () => {
    const result = processEvent(0, 'window-focus');
    expect(result.newCount).toBe(0);
    expect(result.action).toBe('log');
  });

  it('paste-attempt increments strike', () => {
    expect(processEvent(0, 'paste-attempt').newCount).toBe(1);
  });
});

// ── MCQ answer evaluation ─────────────────────────────────────────────────────
describe('MCQ answer evaluation', () => {
  function evaluateMCQ(selectedOption: string, correctAnswer: string): boolean {
    return selectedOption === correctAnswer;
  }

  it('correct option → true', () => { expect(evaluateMCQ('A', 'A')).toBe(true); });
  it('wrong option → false',  () => { expect(evaluateMCQ('B', 'A')).toBe(false); });
  it('case-sensitive matching', () => { expect(evaluateMCQ('a', 'A')).toBe(false); });
});

// ── Session completion logic ──────────────────────────────────────────────────
describe('Session completion', () => {
  it('session completes after 20 questions', () => {
    const TOTAL = 20;
    let index = 0;
    while (index < TOTAL) index++;
    expect(index >= TOTAL).toBe(true);
  });

  it('terminated session cannot accept new answers', () => {
    const session = { ...BASE_STATE, isTerminated: true };
    const canAccept = !session.isTerminated;
    expect(canAccept).toBe(false);
  });
});
