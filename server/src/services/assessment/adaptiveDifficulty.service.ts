import type { SkillTier } from '@SkillSeal/shared';
import type { ServerSessionState } from '../../utils/redis';
import { updateSession } from '../../utils/redis';
const TIER_ORDER: SkillTier[] = ['beginner', 'intermediate', 'advanced', 'expert'];
const STEP_UP = 3, STEP_DOWN = 2, MAX_STEPS = 2;
function tierIndex(t: string) { return TIER_ORDER.indexOf(t as SkillTier); }
function tierAt(i: number): SkillTier { return TIER_ORDER[Math.max(0, Math.min(TIER_ORDER.length - 1, i))]; }
export interface DifficultyResult { updatedState: ServerSessionState; tierChanged: boolean; newTier: SkillTier; direction: 'up' | 'down' | 'none'; }
export async function adjustDifficulty(state: ServerSessionState, wasCorrect: boolean): Promise<DifficultyResult> {
  const declaredIdx = tierIndex(state.declaredTier);
  const currentIdx = tierIndex(state.currentTier);
  let { consecutiveCorrect, consecutiveIncorrect, tierStepsUp, tierStepsDown } = state;
  let newIdx = currentIdx, direction: 'up' | 'down' | 'none' = 'none';
  if (wasCorrect) {
    consecutiveCorrect++; consecutiveIncorrect = 0;
    if (consecutiveCorrect >= STEP_UP && tierStepsUp < MAX_STEPS && currentIdx < TIER_ORDER.length - 1) {
      newIdx = currentIdx + 1; tierStepsUp++; direction = 'up'; consecutiveCorrect = 0;
    }
  } else {
    consecutiveIncorrect++; consecutiveCorrect = 0;
    if (consecutiveIncorrect >= STEP_DOWN && tierStepsDown < MAX_STEPS && currentIdx > 0) {
      newIdx = currentIdx - 1; tierStepsDown++; direction = 'down'; consecutiveIncorrect = 0;
    }
  }
  const newTier = tierAt(newIdx);
  const updatedState = await updateSession(state.sessionId, { consecutiveCorrect, consecutiveIncorrect, currentTier: newTier, tierStepsUp, tierStepsDown });
  if (!updatedState) throw new Error('Session not found');
  return { updatedState, tierChanged: newTier !== state.currentTier, newTier, direction };
}
export function getTierDistribution(t: SkillTier): { tier: SkillTier; count: number }[] {
  const idx = tierIndex(t);
  if (t === 'beginner' || t === 'expert') return [{ tier: t, count: 20 }];
  return [{ tier: tierAt(idx - 1), count: 2 }, { tier: t, count: 16 }, { tier: tierAt(idx + 1), count: 2 }];
}
