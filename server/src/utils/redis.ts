import { getRedis } from '../config/redis';
import logger from './logger';

const SESSION_TTL = 7200;
const ANSWER_TTL  = SESSION_TTL;

export const redisKeys = {
  session:       (id: string) => `session:${id}`,
  answer:        (sid: string, qid: string) => `answer:${sid}:${qid}`,
  cooldown:      (uid: string, skid: string) => `cooldown:${uid}:${skid}`,
  activeSession: (uid: string) => `active_session:${uid}`,
};

export interface ServerSessionState {
  sessionId: string; userId: string; skillId: string; skillSlug: string;
  declaredTier: string; currentTier: string;
  questionIndex: number; consecutiveCorrect: number; consecutiveIncorrect: number;
  runningConceptScore: number; runningSpeedScore: number;
  strikeCount: number; questionHistory: string[];
  questionStartTime: number; isTerminated: boolean; terminationReason: string;
  tierStepsUp: number; tierStepsDown: number;
  answers: { questionId: string; questionType: string; isCorrect: boolean | null;
             timeTakenMs: number; conceptScore: number; aiScore: number; isTimeout: boolean; }[];
}

export async function getSession(id: string): Promise<ServerSessionState | null> {
  try { const r = await getRedis().get(redisKeys.session(id)); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
export async function saveSession(s: ServerSessionState): Promise<void> {
  await getRedis().set(redisKeys.session(s.sessionId), JSON.stringify(s), 'EX', SESSION_TTL);
}
export async function updateSession(id: string, updates: Partial<ServerSessionState>): Promise<ServerSessionState | null> {
  const existing = await getSession(id);
  if (!existing) return null;
  const next = { ...existing, ...updates };
  await saveSession(next);
  return next;
}
export async function deleteSession(id: string): Promise<void> {
  await getRedis().del(redisKeys.session(id));
}

export interface StoredAnswer { correctAnswer: string; questionType: string; concept: string; difficulty: string; aiEvalCriteria?: string; }
export async function setAnswer(sid: string, qid: string, data: StoredAnswer): Promise<void> {
  await getRedis().set(redisKeys.answer(sid, qid), JSON.stringify(data), 'EX', ANSWER_TTL);
}
export async function getAnswer(sid: string, qid: string): Promise<StoredAnswer | null> {
  try { const r = await getRedis().get(redisKeys.answer(sid, qid)); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
export async function consumeAnswer(sid: string, qid: string): Promise<StoredAnswer | null> {
  try {
    const key = redisKeys.answer(sid, qid);
    const r = await getRedis().get(key);
    if (!r) return null;
    await getRedis().del(key); // atomic delete — prevents duplicate submission on retry
    return JSON.parse(r);
  }
  catch { return null; }
}
export async function setActiveSession(uid: string, sid: string): Promise<void> {
  await getRedis().set(redisKeys.activeSession(uid), sid, 'EX', SESSION_TTL);
}
export async function getActiveSession(uid: string): Promise<string | null> {
  return getRedis().get(redisKeys.activeSession(uid));
}
export async function clearActiveSession(uid: string): Promise<void> {
  await getRedis().del(redisKeys.activeSession(uid));
}
export async function setCooldown(uid: string, skid: string, ttl: number): Promise<void> {
  if (ttl > 0) await getRedis().set(redisKeys.cooldown(uid, skid), '1', 'EX', ttl);
}
export async function getCooldown(uid: string, skid: string): Promise<boolean> {
  return (await getRedis().get(redisKeys.cooldown(uid, skid))) !== null;
}
export async function getCooldownTTL(uid: string, skid: string): Promise<number> {
  return getRedis().ttl(redisKeys.cooldown(uid, skid));
}
