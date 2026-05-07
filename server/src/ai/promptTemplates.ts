// ─────────────────────────────────────────────────────────────────────────────
// promptTemplates.ts
// AI prompt template library for SkillSeal skill verification question generation.
//
// CONTRACT:
//   • Every template instructs the model to return JSON ONLY — no preamble,
//     no markdown fences, no explanation outside the JSON object.
//   • MCQ / Scenario JSON shape:
//       { question, options: {A,B,C,D}, correctAnswer, concept, difficulty }
//   • Micro-theory JSON shape:
//       { question, rubric: string[], concept, difficulty }
//   • Every user prompt includes {mutationSeed} and {sessionHistory} to ensure
//     uniqueness and prevent concept repetition within a session.
// ─────────────────────────────────────────────────────────────────────────────

import type { QuestionType, SkillTier } from '@SkillSeal/shared';
import type { SupportedSkill } from './conceptLibrary';

// ── Template structure ────────────────────────────────────────────────────────

export interface PromptTemplate {
  /** Immutable system role string — sets model persona and output contract */
  system: string;
  /**
   * User message template — contains {concept}, {mutationSeed},
   * {sessionHistory} placeholders to be interpolated at generation time.
   */
  user: string;
}

export type TemplateKey = `${SupportedSkill}__${SkillTier}__${QuestionType}`;

// ── Shared system preambles ───────────────────────────────────────────────────

const MCQ_SYSTEM_CONTRACT = `
You are an expert technical assessment engine for a professional skill verification platform.
Your only job is to generate high-quality, unambiguous multiple-choice questions.

OUTPUT RULES — MUST be followed exactly:
1. Return ONLY a single JSON object. No markdown. No code fences. No explanation.
2. The JSON must exactly match this shape:
   {
     "question": "<full question text, may include a code block using markdown triple-backtick syntax inside the string>",
     "options": { "A": "<option>", "B": "<option>", "C": "<option>", "D": "<option>" },
     "correctAnswer": "<A|B|C|D>",
     "concept": "<concept name>",
     "difficulty": "<easy|medium|hard>"
   }
3. All four options must be plausible — avoid obviously wrong distractors.
4. The question must be self-contained; do not reference external links.
5. Do not reveal the answer inside the question text or distractors.
`.trim();

const SCENARIO_SYSTEM_CONTRACT = `
You are an expert technical assessment engine for a professional skill verification platform.
Your only job is to generate scenario-based multiple-choice questions that test applied understanding.

OUTPUT RULES — MUST be followed exactly:
1. Return ONLY a single JSON object. No markdown. No code fences. No explanation.
2. The JSON must exactly match this shape:
   {
     "question": "<scenario description followed by a specific question — may include a code snippet>",
     "options": { "A": "<option>", "B": "<option>", "C": "<option>", "D": "<option>" },
     "correctAnswer": "<A|B|C|D>",
     "concept": "<concept name>",
     "difficulty": "<easy|medium|hard>"
   }
3. The scenario must describe a realistic production situation or debugging challenge.
4. All four options must represent plausible engineering decisions or diagnoses.
5. Do not reveal the answer in the scenario text.
`.trim();

const MICRO_THEORY_SYSTEM_CONTRACT = `
You are an expert technical assessment engine for a professional skill verification platform.
Your only job is to generate open-ended micro-theory questions with detailed grading rubrics.

OUTPUT RULES — MUST be followed exactly:
1. Return ONLY a single JSON object. No markdown. No code fences. No explanation.
2. The JSON must exactly match this shape:
   {
     "question": "<open-ended question requiring a concise written explanation — 2 to 4 sentences expected>",
     "rubric": ["<criterion 1>", "<criterion 2>", "<criterion 3>", "<criterion 4>"],
     "concept": "<concept name>",
     "difficulty": "<medium|hard>"
   }
3. The rubric must contain 3–5 specific, measurable criteria an AI evaluator can check.
4. Each rubric item should be one sentence describing a key insight the candidate must demonstrate.
5. The question must NOT be answerable with a simple yes/no or a single word.
`.trim();

// ── Shared user prompt fragments ──────────────────────────────────────────────

const UNIQUENESS_FOOTER = `
Mutation seed (use this to ensure a unique question variant): {mutationSeed}
Concepts already covered this session (DO NOT repeat these): {sessionHistory}
`.trim();

// ─────────────────────────────────────────────────────────────────────────────
// Template definitions
// ─────────────────────────────────────────────────────────────────────────────

export const PROMPT_TEMPLATES: Partial<Record<TemplateKey, PromptTemplate>> = {

  // ── React × Beginner × MCQ ─────────────────────────────────────────────────
  'react__beginner__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one BEGINNER-level MCQ for a React developer assessment.
Concept to test: {concept}
Difficulty: easy

The question should test foundational React knowledge that a developer with
less than 6 months of experience should know. It can involve JSX, basic hooks,
props, or simple rendering logic. A code snippet is encouraged but not required.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  // ── React × Intermediate × MCQ ─────────────────────────────────────────────
  'react__intermediate__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level MCQ for a React developer assessment.
Concept to test: {concept}
Difficulty: medium

The question should test a developer with 1–3 years of React experience.
Focus on hook semantics, component patterns, re-render behaviour, or
common real-world bugs. Including a code snippet is strongly recommended.
Distractors should reflect common mid-level misconceptions.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  // ── React × Advanced × MCQ ─────────────────────────────────────────────────
  'react__advanced__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level MCQ for a React developer assessment.
Concept to test: {concept}
Difficulty: hard

The question should target a senior React developer (3+ years). It should
probe deep understanding of React internals, concurrent features, performance
optimization, or nuanced hook edge cases. A non-trivial code snippet is
expected. All four options should be technically defensible to make
elimination reasoning necessary.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  // ── React × Beginner × Scenario ────────────────────────────────────────────
  'react__beginner__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one BEGINNER-level scenario-based MCQ for a React developer assessment.
Concept to test: {concept}
Difficulty: easy

Describe a simple, realistic situation a junior React developer would encounter
(e.g., a broken render, a state that doesn't update, a prop not reaching a child).
Include a short code snippet showing the problematic code, then ask what the
developer should do or what will happen. Distractors should reflect typical
beginner mistakes.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  // ── React × Intermediate × Scenario ────────────────────────────────────────
  'react__intermediate__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level scenario-based MCQ for a React developer assessment.
Concept to test: {concept}
Difficulty: medium

Describe a realistic production scenario: a performance bug, an unexpected
re-render, a stale closure, or a useEffect dependency issue. Show relevant code
(15–30 lines max). Ask the candidate to identify the root cause or the correct
fix. The correct answer should require understanding of React's rendering model,
not just syntax familiarity.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  // ── React × Advanced × Scenario ────────────────────────────────────────────
  'react__advanced__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level scenario-based MCQ for a React developer assessment.
Concept to test: {concept}
Difficulty: hard

Describe a complex, production-grade engineering challenge: concurrent rendering
interactions, RSC/RCC boundary decisions, large-scale state management trade-offs,
or subtle memory leaks. The scenario should be detailed enough (20–40 lines of
relevant code or architecture description) to require deep expertise to diagnose.
All four options should represent architecturally sound but subtly different
approaches, with only one being clearly optimal for the given constraints.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  // ── React × Intermediate × Micro-theory ────────────────────────────────────
  'react__intermediate__micro-theory': {
    system: MICRO_THEORY_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level micro-theory question for a React developer assessment.
Concept to test: {concept}
Difficulty: medium

The question should ask the candidate to briefly explain a React mechanism,
pattern, or decision trade-off in their own words (2–4 sentences expected).
The rubric should assess: accuracy of the core explanation, mention of at least
one concrete trade-off or caveat, and practical awareness (when to use / not use).

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  // ── React × Advanced × Micro-theory ────────────────────────────────────────
  'react__advanced__micro-theory': {
    system: MICRO_THEORY_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level micro-theory question for a React developer assessment.
Concept to test: {concept}
Difficulty: hard

The question should require the candidate to reason about internals, trade-offs
at scale, or architectural decisions — not just describe an API. Expect 3–5
sentences from the candidate. The rubric should have 4–5 criteria covering:
correct conceptual model, edge case awareness, trade-off articulation, and
real-world applicability. Vague or surface-level answers should score 0 on
the relevant rubric items.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  // ── Node.js × Intermediate × MCQ ───────────────────────────────────────────
  'nodejs__intermediate__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level MCQ for a Node.js developer assessment.
Concept to test: {concept}
Difficulty: medium

The question should test a developer with 1–3 years of Node.js experience.
Focus on the event loop, streams, async patterns, Express middleware, or
common production pitfalls. A code snippet is strongly encouraged.
Distractors should target common mid-level misunderstandings of Node.js's
non-blocking I/O model or async behaviour.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  // ── MongoDB × Intermediate × MCQ ───────────────────────────────────────────
  'mongodb__intermediate__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level MCQ for a MongoDB developer assessment.
Concept to test: {concept}
Difficulty: medium

The question should test a developer with 1–3 years of MongoDB experience.
Focus on the aggregation pipeline, index selection, schema design trade-offs,
or common Mongoose patterns. Include a realistic query or schema snippet where
helpful. Distractors should reflect common mistakes around query operators,
index usage, or document design that mid-level developers make.

${UNIQUENESS_FOOTER}
    `.trim(),
  },
};

// ── Template selector ─────────────────────────────────────────────────────────

/**
 * Retrieves the correct prompt template for the given combination.
 * Throws if no template exists — callers should validate inputs before calling.
 */
export function getTemplate(
  skill: SupportedSkill,
  tier: SkillTier,
  questionType: QuestionType
): PromptTemplate {
  const key: TemplateKey = `${skill}__${tier}__${questionType}`;
  const template = (PROMPT_TEMPLATES as Record<string, PromptTemplate | undefined>)[key];
  if (!template) {
    // Fallback: try intermediate tier for the same skill+type
    const fallbackKey = `${skill}__intermediate__${questionType}` as TemplateKey;
    const fallback = (PROMPT_TEMPLATES as Record<string, PromptTemplate | undefined>)[fallbackKey];
    if (fallback) return fallback;
    throw new Error(
      `No prompt template found for key "${key}". ` +
      `Supported combinations: ${Object.keys(PROMPT_TEMPLATES).join(', ')}`
    );
  }
  return template;
}

/**
 * Interpolates template placeholders with runtime values.
 * All {placeholder} tokens in the user prompt are replaced.
 */
export function interpolateTemplate(
  template: PromptTemplate,
  vars: {
    concept: string;
    mutationSeed: string;
    sessionHistory: string;
  }
): { system: string; user: string } {
  let user = template.user;
  user = user.replace('{concept}', vars.concept);
  user = user.replace('{mutationSeed}', vars.mutationSeed);
  user = user.replace('{sessionHistory}', vars.sessionHistory || 'none');
  return { system: template.system, user };
}
