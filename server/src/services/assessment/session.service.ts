import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { Session } from '../../models/Session.model';
import { Skill } from '../../models/Skill.model';
import { User } from '../../models/User.model';
import { Answer } from '../../models/Answer.model';
import { AppError } from '../../middleware/error.middleware';
import { getSession, saveSession, updateSession, deleteSession, setAnswer, getAnswer, consumeAnswer, setActiveSession, getActiveSession, clearActiveSession, setCooldown, getCooldown, getCooldownTTL } from '../../utils/redis';
import type { ServerSessionState, StoredAnswer } from '../../utils/redis';
import { generateQuestion } from '../../ai/questionGenerator';
import type { SupportedSkill } from '../../ai/conceptLibrary';
// UX-15: single source of truth — pull the supported-skill list straight
// from conceptLibrary instead of re-declaring it here. The local list could
// drift when new skills are added to the registry.
import { pickConcept, SUPPORTED_SKILLS } from '../../ai/conceptLibrary';
import { adjustDifficulty } from './adaptiveDifficulty.service';
import { evaluateMicroTheory } from './microTheory.service';
import { notify } from '../notifications.service';
import { checkVerificationLimit } from '../billing.service';
import logger from '../../utils/logger';
import type { IQuestion, ISessionState, SkillTier } from '@SkillSeal/shared';

const TOTAL_QUESTIONS = 20;
// CRIT-09: cooldown constants exported so certificate.service.ts can enforce
// retake lockouts on FAIL/PARTIAL completions.
export const COOLDOWN_PARTIAL = 7 * 24 * 3600;
export const COOLDOWN_FAIL = 14 * 24 * 3600;
export { setCooldown };
const Q_PATTERN: Array<'mcq' | 'scenario' | 'micro-theory'> = ['mcq', 'mcq', 'mcq', 'scenario', 'mcq', 'mcq', 'mcq', 'scenario', 'micro-theory', 'mcq'];
function qType(i: number): 'mcq' | 'scenario' | 'micro-theory' { return Q_PATTERN[i % Q_PATTERN.length]; }
const TIMERS: Record<string, number> = { mcq: 60, scenario: 120, 'micro-theory': 150 };
// UX-15: SUPPORTED_SKILLS now imported from conceptLibrary so the registry
// is the single source of truth.

function toSkill(slug: string): SupportedSkill {
  if (SUPPORTED_SKILLS.includes(slug as SupportedSkill)) {
    return slug as SupportedSkill;
  }
  throw new AppError(
    `Skill "${slug}" does not have an assessment available yet. Please choose React, Node.js, or MongoDB.`,
    400,
    true,
  );
}

async function buildQuestion(state: ServerSessionState) {
  const qt = qType(state.questionIndex);
  const skill = toSkill(state.skillSlug);
  // Use questionIndex as the deterministic seed so concepts cycle sequentially
  // through the pool. Date.now() caused two close-in-time calls to pick the
  // same concept (same modulo result), producing repeated/mixed questions.
  const conceptEntry = pickConcept(skill, state.currentTier as SkillTier, state.questionHistory, state.questionIndex);
  const seed = `${state.sessionId}-${state.questionIndex}-${Date.now()}`;
  // Pass human-readable concept labels (not raw id slugs) so the AI
  // understands which topics have already been covered.
  const conceptLabels = state.questionHistory.map((_id, idx) => `Q${idx + 1}:${_id}`);
  const q = await generateQuestion({ skill, tier: state.currentTier as SkillTier, questionType: qt, concept: conceptEntry.label, mutationSeed: seed, sessionHistory: conceptLabels, skillId: state.skillId });
  const client: IQuestion = { _id: q._id!, questionType: q.questionType, difficulty: q.difficulty, tier: q.tier, skillId: q.skillId, text: q.text, options: q.options, timeLimitMs: TIMERS[qt] * 1000, pointValue: q.pointValue, hint: q.hint };
  const stored: StoredAnswer = { correctAnswer: q.correctAnswer ?? "", questionType: q.questionType, concept: conceptEntry.id, difficulty: q.difficulty, aiEvalCriteria: q.aiEvalCriteria };
  return { clientQuestion: client, storedAnswer: stored, conceptId: conceptEntry.id };
}

export async function startSession(input: { userId: string; skillId: string; tier: SkillTier }) {
  const { userId, skillId, tier } = input;
  const skill = await Skill.findById(skillId).lean<{ _id: Types.ObjectId; name: string; slug: string; availableTiers: string[]; isActive: boolean }>();
  if (!skill || !skill.isActive) throw new AppError('Skill not found.', 404, true);
  if (!skill.availableTiers.includes(tier)) throw new AppError(`Tier "${tier}" not available.`, 400, true);
  const existing = await getActiveSession(userId);
  if (existing) { const es = await getSession(existing); if (es && !es.isTerminated) throw new AppError('Active session exists.', 409, true); }
  const onCooldown = await getCooldown(userId, skillId);
  if (onCooldown) { const ttl = await getCooldownTTL(userId, skillId); const days = Math.ceil(ttl / 86400); throw new AppError(`Cooldown active. Retry in ${days} day(s).`, 429, true); }
  await checkVerificationLimit(userId);
  const dbSession = await Session.create({ userId: new Types.ObjectId(userId), skillId: new Types.ObjectId(skillId), declaredTier: tier, finalTier: '', startTime: new Date(), status: 'active', strikeCount: 0 });
  const sessionId = dbSession._id.toString();
  const state: ServerSessionState = { sessionId, userId, skillId, skillSlug: skill.slug, declaredTier: tier, currentTier: tier, questionIndex: 0, consecutiveCorrect: 0, consecutiveIncorrect: 0, runningConceptScore: 0, runningSpeedScore: 0, strikeCount: 0, questionHistory: [], questionStartTime: Date.now(), isTerminated: false, terminationReason: '', tierStepsUp: 0, tierStepsDown: 0, answers: [] };
  await saveSession(state);
  await setActiveSession(userId, sessionId);

  let clientQuestion: IQuestion, storedAnswer: StoredAnswer, conceptId: string;
  try {
    const built = await buildQuestion(state);
    clientQuestion = built.clientQuestion;
    storedAnswer = built.storedAnswer;
    conceptId = built.conceptId;
  } catch (err) {
    // Clean up the session we just created so the user can retry
    await Session.findByIdAndDelete(sessionId);
    await clearActiveSession(userId);
    const msg = err instanceof Error ? err.message : String(err);
    throw new AppError(`Failed to generate first question: ${msg}`, 503, true);
  }

  await setAnswer(sessionId, clientQuestion._id, storedAnswer);
  await updateSession(sessionId, { questionHistory: [conceptId], questionStartTime: Date.now() });
  const sessionState: ISessionState = { sessionId, skillId, skillName: skill.name, declaredTier: tier, status: 'active', startTime: dbSession.createdAt.toISOString(), currentQuestionIndex: 0, totalQuestions: TOTAL_QUESTIONS, timeRemainingMs: clientQuestion.timeLimitMs, strikeCount: 0, maxStrikes: 3, answeredCount: 0, timeoutCount: 0 };
  logger.info(`[session] Started: ${sessionId}`);
  return { sessionId, firstQuestion: clientQuestion, sessionState };
}

export async function submitAnswer(input: { sessionId: string; questionId: string; selectedOption: string | null; textAnswer: string; timeTakenMs: number; isTimeout: boolean }) {
  const { sessionId, questionId, selectedOption, textAnswer, timeTakenMs, isTimeout } = input;
  const state = await getSession(sessionId);
  if (!state) throw new AppError('Session not found.', 404, true);
  if (state.isTerminated) throw new AppError('Session terminated.', 409, true);
  const stored = await consumeAnswer(sessionId, questionId);
  if (!stored) throw new AppError('Question not found or already answered.', 404, true);
  const maxTime = (TIMERS[stored.questionType] ?? 60) * 1000;

  // CRIT-08: enforce timer on the server. If the client took longer than maxTime
  // but did not flag isTimeout, treat the submission as a timeout. Prevents
  // bypassing the timer via paused JS execution or tampered timeTakenMs values.
  let serverEnforcedTimeout = isTimeout;
  if (timeTakenMs > maxTime && !isTimeout) {
    serverEnforcedTimeout = true;
  }
  const speedPct = serverEnforcedTimeout ? 0 : Math.max(0, 1 - timeTakenMs / maxTime);
  let isCorrect: boolean | null, conceptScore: number, aiScore = 0;
  if (serverEnforcedTimeout) { isCorrect = false; conceptScore = 0; }
  else if (stored.questionType === 'micro-theory') {
    const rubric = (stored.aiEvalCriteria ?? stored.correctAnswer ?? '').split('\n').filter(Boolean);
    const res = await evaluateMicroTheory(textAnswer || '', rubric, stored.concept ?? '', timeTakenMs);
    isCorrect = res.conceptScore >= 0.5; conceptScore = res.conceptScore; aiScore = res.aiScore;
  } else {
    const s = (selectedOption ?? '').trim().toUpperCase(), c = stored.correctAnswer.trim().toUpperCase();
    isCorrect = s === c; conceptScore = isCorrect ? 1 : 0;
  }
  state.answers.push({ questionId, questionType: stored.questionType, isCorrect, timeTakenMs, conceptScore, aiScore, isTimeout: serverEnforcedTimeout });
  state.runningConceptScore += conceptScore; state.runningSpeedScore += speedPct; state.questionIndex += 1;

  // CRITICAL: Persist answer to MongoDB so computeCompositeScore can read it.
  // Without this write, the Answer collection stays empty and every assessment scores 0/100.
  try {
    await Answer.create({
      sessionId:      new Types.ObjectId(sessionId),
      questionId:     new Types.ObjectId(questionId),
      questionType:   stored.questionType,
      difficulty:     stored.difficulty ?? 'medium',
      selectedOption: selectedOption ?? null,
      textAnswer:     textAnswer ?? '',
      isTimeout:      serverEnforcedTimeout,
      isCorrect,
      conceptScore,
      aiScore,
      timeTaken:      timeTakenMs,
      submittedAt:    new Date(),
    });
  } catch (e) {
    // Don't fail the request if the persist fails — answer is still in Redis state.
    // But log so we can investigate.
    logger.error('[submitAnswer] failed to persist Answer doc:', (e as Error)?.message);
  }

  // ── CRITICAL: persist answers + questionIndex to Redis BEFORE calling
  // adjustDifficulty.  adjustDifficulty calls updateSession which reads the
  // current Redis state and merges only tier/streak fields via spread operator
  // ({ ...existing, ...updates }).  If we haven't saved the incremented
  // questionIndex yet, updateSession reads the OLD index from Redis and
  // Object.assign below overwrites our in-memory increment — meaning
  // questionIndex never advances and the session loops forever.
  await updateSession(sessionId, {
    answers:              state.answers,
    questionIndex:        state.questionIndex,
    runningConceptScore:  state.runningConceptScore,
    runningSpeedScore:    state.runningSpeedScore,
  });

  if (isCorrect !== null) { const { updatedState } = await adjustDifficulty(state, isCorrect); Object.assign(state, updatedState); }

  const isComplete = state.questionIndex >= TOTAL_QUESTIONS;
  if (isComplete) {
    const { issueCertificate } = await import('./certificate.service');
    await issueCertificate(sessionId);
    return { isCorrect, conceptScore, nextQuestion: null, sessionState: buildClientState(state, null), isComplete: true };
  }
  const latestState = await getSession(sessionId);
  const { clientQuestion: nq, storedAnswer: na, conceptId } = await buildQuestion(latestState ?? state);
  await setAnswer(sessionId, nq._id, na);
  await updateSession(sessionId, { questionHistory: [...(latestState?.questionHistory ?? state.questionHistory), conceptId], questionStartTime: Date.now() });
  return { isCorrect, conceptScore, nextQuestion: nq, sessionState: buildClientState(latestState ?? state, nq), isComplete: false };
}

export async function recordStrike(sessionId: string, eventType: string, details?: string) {
  const state = await getSession(sessionId);
  if (!state || state.isTerminated) return { strikeCount: 0, terminated: true };
  const newCount = state.strikeCount + 1; const terminated = newCount >= 3;
  await updateSession(sessionId, { strikeCount: newCount, isTerminated: terminated, terminationReason: terminated ? 'strike_limit_reached' : state.terminationReason });
  await Session.findByIdAndUpdate(sessionId, { $inc: { strikeCount: 1 }, $push: { violationLog: { eventType, timestamp: new Date(), details: details ?? '' } }, ...(terminated ? { status: 'terminated', terminationReason: 'strike_limit_reached' } : {}) });
  // CRIT-11: cheating users get COOLDOWN_FAIL (14 days), not COOLDOWN_PARTIAL (7).
  // Honest users who just scored low get 7 days; a terminated-for-strikes user
  // must not be rewarded with a shorter lockout than that.
  if (terminated) { await clearActiveSession(state.userId); await setCooldown(state.userId, state.skillId, COOLDOWN_FAIL); }
  return { strikeCount: newCount, terminated };
}

function buildClientState(state: ServerSessionState, nq: IQuestion | null): ISessionState {
  return { sessionId: state.sessionId, skillId: state.skillId, skillName: state.skillSlug, declaredTier: state.declaredTier as SkillTier, status: state.isTerminated ? 'terminated' : 'active', startTime: new Date().toISOString(), currentQuestionIndex: state.questionIndex, totalQuestions: TOTAL_QUESTIONS, timeRemainingMs: nq?.timeLimitMs ?? 0, strikeCount: state.strikeCount, maxStrikes: 3, answeredCount: state.answers.length, timeoutCount: state.answers.filter(a => a.isTimeout).length };
}

export async function abandonSession(userId: string): Promise<void> {
  const existing = await getActiveSession(userId);
  if (existing) {
    await updateSession(existing, { isTerminated: true, terminationReason: 'user_abandoned' });
    await Session.findByIdAndUpdate(existing, { status: 'terminated', terminationReason: 'user_abandoned' });
    await clearActiveSession(userId);
  }
}

export async function getSessionState(sessionId: string, userId: string) {
  const state = await getSession(sessionId);
  if (!state || state.userId !== userId) return null;
  return buildClientState(state, null);
}
