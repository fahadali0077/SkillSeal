// ─────────────────────────────────────────────────────────────────────────────
// questionGenerator.ts
// Core AI question generation service for SkillSeal skill verification engine.
//
// • Selects the correct prompt template for skill × tier × questionType
// • Calls Groq llama-3.3-70b-versatile (temp 0.8, max_tokens 600, JSON mode)
// • Validates & parses the JSON response
// • Returns IQuestionMutation (server-only — never expose in HTTP responses)
// • Retries exactly once on failure
// • Logs generation time and alerts if > 2000ms
// ─────────────────────────────────────────────────────────────────────────────

// Node's built-in UUID generator. Replaces the `uuid` package, which went
// ESM-only at v14 and broke this CommonJS build at runtime (the compiled
// require() throws ERR_REQUIRE_ESM). randomUUID is v4, available since Node
// 14.17, and removes a dependency plus its advisory entirely.
import { randomUUID } from 'crypto';
import type { IQuestion, IQuestionMutation, QuestionType, SkillTier } from '@SkillSeal/shared';
import { getGroq } from '../config/groq';
import logger from '../utils/logger';
import { getTemplate, interpolateTemplate } from './promptTemplates';
import { pickConcept, type SupportedSkill } from './conceptLibrary';

const GENERATION_TIME_ALERT_MS = 2000;

export interface GenerateQuestionInput {
  skill: SupportedSkill;
  tier: SkillTier;
  questionType: QuestionType;
  concept?: string;
  mutationSeed: string;
  sessionHistory: string[];
  skillId: string;
}

interface RawMCQResponse {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  concept: string;
  difficulty: string;
}

interface RawMicroTheoryResponse {
  question: string;
  rubric: string[];
  concept: string;
  difficulty: string;
}

function isMCQResponse(raw: unknown): raw is RawMCQResponse {
  if (typeof raw !== 'object' || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r['question'] === 'string' &&
    typeof r['options'] === 'object' &&
    r['options'] !== null &&
    typeof (r['options'] as Record<string, unknown>)['A'] === 'string' &&
    typeof (r['options'] as Record<string, unknown>)['B'] === 'string' &&
    typeof (r['options'] as Record<string, unknown>)['C'] === 'string' &&
    typeof (r['options'] as Record<string, unknown>)['D'] === 'string' &&
    ['A', 'B', 'C', 'D'].includes(r['correctAnswer'] as string) &&
    typeof r['concept'] === 'string' &&
    typeof r['difficulty'] === 'string'
  );
}

function isMicroTheoryResponse(raw: unknown): raw is RawMicroTheoryResponse {
  if (typeof raw !== 'object' || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r['question'] === 'string' &&
    Array.isArray(r['rubric']) &&
    (r['rubric'] as unknown[]).every((item) => typeof item === 'string') &&
    (r['rubric'] as unknown[]).length >= 2 &&
    typeof r['concept'] === 'string' &&
    typeof r['difficulty'] === 'string'
  );
}

function normaliseTimeLimitMs(questionType: QuestionType, difficulty: string): number {
  const BASE: Record<QuestionType, number> = {
    mcq: 60_000,
    scenario: 120_000,
    'micro-theory': 180_000,
  };
  const MULTIPLIER: Record<string, number> = { easy: 1.0, medium: 1.25, hard: 1.5 };
  return BASE[questionType] * (MULTIPLIER[difficulty] ?? 1.0);
}

function normalisePointValue(questionType: QuestionType, difficulty: string): number {
  const BASE: Record<QuestionType, number> = { mcq: 1, scenario: 2, 'micro-theory': 3 };
  const BONUS: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
  return BASE[questionType] + (BONUS[difficulty] ?? 0);
}

function parseModelOutput(
  rawText: string,
  questionType: QuestionType,
  skillId: string,
  tier: SkillTier
): IQuestionMutation {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Model returned non-JSON output: ${cleaned.slice(0, 200)}`);
  }

  const isMCQType = questionType === 'mcq' || questionType === 'scenario';

  if (isMCQType) {
    if (!isMCQResponse(parsed)) {
      throw new Error(
        `MCQ/Scenario response failed schema validation: ${JSON.stringify(parsed).slice(0, 300)}`
      );
    }
    const raw = parsed;
    const difficulty = raw.difficulty as IQuestion['difficulty'];
    const base: Omit<IQuestion, '_id'> = {
      questionType,
      difficulty,
      tier,
      skillId,
      text: raw.question,
      options: [raw.options.A, raw.options.B, raw.options.C, raw.options.D],
      timeLimitMs: normaliseTimeLimitMs(questionType, difficulty),
      pointValue: normalisePointValue(questionType, difficulty),
      hint: null,
    };
    const optionMap: Record<string, string> = {
      A: raw.options.A, B: raw.options.B, C: raw.options.C, D: raw.options.D,
    };
    return {
      ...base,
      _id: randomUUID(),
      correctAnswer: raw.correctAnswer,
      explanation: optionMap[raw.correctAnswer] ?? '',
      aiEvalCriteria: '',
      authorId: 'system:ai-generator',
      isActive: true,
      reportCount: 0,
    };
  }

  if (!isMicroTheoryResponse(parsed)) {
    throw new Error(
      `Micro-theory response failed schema validation: ${JSON.stringify(parsed).slice(0, 300)}`
    );
  }
  const raw = parsed;
  const difficulty = raw.difficulty as IQuestion['difficulty'];
  const base: Omit<IQuestion, '_id'> = {
    questionType: 'micro-theory',
    difficulty,
    tier,
    skillId,
    text: raw.question,
    options: null,
    timeLimitMs: normaliseTimeLimitMs('micro-theory', difficulty),
    pointValue: normalisePointValue('micro-theory', difficulty),
    hint: null,
  };
  return {
    ...base,
    _id: randomUUID(),
    correctAnswer: raw.rubric.join('\n'),
    explanation: '',
    aiEvalCriteria: raw.rubric.join('\n'),
    authorId: 'system:ai-generator',
    isActive: true,
    reportCount: 0,
  };
}

async function attemptGeneration(input: GenerateQuestionInput): Promise<IQuestionMutation> {
  const { skill, tier, questionType, mutationSeed, sessionHistory, skillId } = input;

  const conceptEntry = input.concept
    ? { id: 'custom', label: input.concept, description: '' }
    : pickConcept(
      skill, tier, sessionHistory,
      mutationSeed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    );

  const template = getTemplate(skill, tier, questionType);
  const { system, user } = interpolateTemplate(template, {
    concept: `${conceptEntry.label}${conceptEntry.description ? ` — ${conceptEntry.description}` : ''}`,
    mutationSeed,
    sessionHistory: sessionHistory.length > 0 ? sessionHistory.join(', ') : 'none',
  });

  // ── Groq call (15s timeout) ───────────────────────────────────────────────
  const groq = getGroq();
  let rawText: string;
  try {
    const chatCompletion = await groq.chat.completions.create(
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.8,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      },
      { timeout: 15_000 },
    );
    rawText = chatCompletion.choices[0]?.message?.content ?? '';
  } catch (groqErr) {
    const msg = groqErr instanceof Error ? groqErr.message : String(groqErr);
    process.stdout.write(`[groq] ❌ chat.completions.create failed: ${msg}\n`);
    throw new Error(`Groq API error: ${msg}`);
  }

  if (!rawText) {
    throw new Error('Groq returned an empty response');
  }

  return parseModelOutput(rawText, questionType, skillId, tier);
}

/**
 * Generates a single assessment question using Groq llama-3.3-70b-versatile.
 * Retries exactly once on failure.
 */
export async function generateQuestion(input: GenerateQuestionInput): Promise<IQuestionMutation> {
  const start = performance.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await attemptGeneration(input);
      const elapsed = Math.round(performance.now() - start);

      if (elapsed > GENERATION_TIME_ALERT_MS) {
        logger.warn(
          `[questionGenerator] SLOW generation: ${elapsed}ms ` +
          `(${input.skill}/${input.tier}/${input.questionType}) attempt=${attempt}`
        );
      } else {
        logger.info(
          `[questionGenerator] Generated in ${elapsed}ms ` +
          `(${input.skill}/${input.tier}/${input.questionType})`
        );
      }
      return result;
    } catch (err) {
      lastError = err;
      const elapsed = Math.round(performance.now() - start);
      const errMsg = err instanceof Error ? err.message : String(err);
      process.stdout.write(`[groq] attempt ${attempt} failed after ${elapsed}ms: ${errMsg}\n`);
      logger.warn(`[questionGenerator] Attempt ${attempt} failed after ${elapsed}ms: ${errMsg}`);
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  const elapsed = Math.round(performance.now() - start);
  logger.error(
    `[questionGenerator] All attempts failed after ${elapsed}ms for ` +
    `${input.skill}/${input.tier}/${input.questionType}`
  );
  process.stdout.write(
    `[groq] ALL ATTEMPTS FAILED after ${elapsed}ms ` +
    `skill=${input.skill} tier=${input.tier} type=${input.questionType}\n` +
    `[groq] last error: ${lastError instanceof Error ? lastError.message : String(lastError)}\n`
  );
  throw new Error(
    `Question generation failed after 2 attempts: ` +
    `${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}
