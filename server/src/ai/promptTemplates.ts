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


  // ════════════════════════════════════════════════════════════════════════════
  // NODE.JS — full tier coverage
  // ════════════════════════════════════════════════════════════════════════════

  'nodejs__beginner__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one BEGINNER-level MCQ for a Node.js developer assessment.
Concept to test: {concept}
Difficulty: easy

The question should test foundational Node.js knowledge (< 6 months experience).
Topics: require/import, basic fs/path modules, npm, simple Express routes,
process.env, callbacks vs Promises basics. A short code snippet is encouraged.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'nodejs__advanced__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level MCQ for a Node.js developer assessment.
Concept to test: {concept}
Difficulty: hard

The question should test deep Node.js expertise (3+ years).
Topics: V8 internals, libuv, cluster module, worker threads, stream backpressure,
native addons, perf_hooks, advanced error propagation, large-scale production pitfalls.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'nodejs__beginner__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one BEGINNER-level scenario question for a Node.js assessment.
Concept to test: {concept}
Difficulty: easy

Describe a simple real-world situation a junior Node.js developer encounters:
debugging a callback error, reading a file with fs, setting up a basic Express route.
All four options should be plausible beginner decisions.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'nodejs__advanced__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level scenario question for a Node.js assessment.
Concept to test: {concept}
Difficulty: hard

Describe a complex production situation: memory leak investigation, stream pipeline
failure, worker thread communication deadlock, EventEmitter leak, high-load event loop
saturation. All four options should represent plausible expert-level diagnoses.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'nodejs__intermediate__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level scenario question for a Node.js assessment.
Concept to test: {concept}
Difficulty: medium

Describe a realistic mid-level production situation: async/await pitfall, middleware
ordering bug, stream pipe error handling, unhandled promise rejection, or module
caching issue. All options should be plausible engineering decisions.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'nodejs__intermediate__micro-theory': {
    system: MICRO_THEORY_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level micro-theory question for a Node.js assessment.
Concept to test: {concept}
Difficulty: medium

The question should ask the candidate to explain a Node.js concept in 2–4 sentences:
event loop phases, how streams work internally, why Promises chain, how middleware
functions, or the difference between process.nextTick and setImmediate.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'nodejs__advanced__micro-theory': {
    system: MICRO_THEORY_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level micro-theory question for a Node.js assessment.
Concept to test: {concept}
Difficulty: hard

Ask the candidate to explain a deep Node.js concept: libuv thread pool, V8 hidden
classes and JIT deoptimisation, backpressure in Transform streams, worker thread
SharedArrayBuffer patterns, or native addon N-API lifecycle.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // MONGODB — full tier coverage
  // ════════════════════════════════════════════════════════════════════════════

  'mongodb__beginner__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one BEGINNER-level MCQ for a MongoDB developer assessment.
Concept to test: {concept}
Difficulty: easy

Test foundational MongoDB knowledge (< 6 months): basic CRUD operations,
find() with simple filters, insertOne/Many, updateOne with $set, deleteOne,
document structure, ObjectId, simple Mongoose model definitions.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'mongodb__advanced__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level MCQ for a MongoDB developer assessment.
Concept to test: {concept}
Difficulty: hard

Test advanced MongoDB expertise: aggregation pipeline optimisation, sharding key
selection, change streams, multi-document transactions, compound index strategies,
read/write concerns, WiredTiger storage engine internals.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'mongodb__beginner__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one BEGINNER-level scenario question for a MongoDB assessment.
Concept to test: {concept}
Difficulty: easy

Describe a simple real-world situation: choosing between updateOne and replaceOne,
fixing a Mongoose validation error, designing a basic document schema, or debugging
a missing field in a query result.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'mongodb__intermediate__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level scenario question for a MongoDB assessment.
Concept to test: {concept}
Difficulty: medium

Describe a realistic production situation: slow query requiring an index,
choosing between embedded and referenced documents, fixing an aggregation
pipeline stage order, or handling concurrent update conflicts.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'mongodb__advanced__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level scenario question for a MongoDB assessment.
Concept to test: {concept}
Difficulty: hard

Describe a complex production situation: oplog tailing, zone sharding decision,
stale reads under replica set election, change stream resume token handling,
or transaction write conflict resolution.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'mongodb__intermediate__micro-theory': {
    system: MICRO_THEORY_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level micro-theory question for a MongoDB assessment.
Concept to test: {concept}
Difficulty: medium

Ask the candidate to explain: how MongoDB handles multi-document transactions,
the difference between $lookup and embedding, how covered queries work, or
why index order matters in compound indexes.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'mongodb__advanced__micro-theory': {
    system: MICRO_THEORY_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level micro-theory question for a MongoDB assessment.
Concept to test: {concept}
Difficulty: hard

Ask the candidate to explain: WiredTiger MVCC and snapshot isolation, change
stream internals and the oplog, shard key immutability implications, or
write concern majority and its relationship to replica set elections.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TYPESCRIPT
  // ════════════════════════════════════════════════════════════════════════════

  'typescript__beginner__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one BEGINNER-level MCQ for a TypeScript developer assessment.
Concept to test: {concept}
Difficulty: easy

Test foundational TypeScript knowledge (< 6 months): basic type annotations,
interfaces, type aliases, simple generics, union types, enums. Include a short
code snippet. Distractors should target common beginner type errors.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'typescript__intermediate__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level MCQ for a TypeScript developer assessment.
Concept to test: {concept}
Difficulty: medium

Test TypeScript proficiency (1–3 years): utility types, mapped types, conditional
types, discriminated unions, declaration files, strict mode settings. Include a
type-level code snippet. Distractors should reflect common intermediate mistakes.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'typescript__advanced__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level MCQ for a TypeScript developer assessment.
Concept to test: {concept}
Difficulty: hard

Test deep TypeScript expertise: template literal types, infer in conditionals,
variance, decorators, module augmentation, type-level programming. The question
should involve non-trivial type inference or type-level logic.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'typescript__beginner__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one BEGINNER-level scenario question for a TypeScript assessment.
Concept to test: {concept}
Difficulty: easy

Describe a simple situation a junior TypeScript developer faces: fixing a type
error in props, adding return type annotation, resolving a union type narrowing
issue, or configuring tsconfig for a new project.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'typescript__intermediate__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level scenario question for a TypeScript assessment.
Concept to test: {concept}
Difficulty: medium

Describe a realistic TypeScript production challenge: choosing between interface
and type alias, fixing a mapped type that breaks, writing a type guard, resolving
a complex generic constraint error, or augmenting a third-party module.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'typescript__advanced__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level scenario question for a TypeScript assessment.
Concept to test: {concept}
Difficulty: hard

Describe an advanced TypeScript situation: debugging a conditional type that
distributes unexpectedly, writing a type-safe builder pattern, resolving variance
issues in a generic container, or optimising a type that causes "type instantiation
is excessively deep" errors.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'typescript__intermediate__micro-theory': {
    system: MICRO_THEORY_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level micro-theory question for a TypeScript assessment.
Concept to test: {concept}
Difficulty: medium

Ask the candidate to explain a TypeScript concept in 2–4 sentences: how utility
types like Partial or Readonly work internally, the difference between interface
and type alias, how discriminated unions enable exhaustiveness checking, or why
strictNullChecks matters.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'typescript__advanced__micro-theory': {
    system: MICRO_THEORY_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level micro-theory question for a TypeScript assessment.
Concept to test: {concept}
Difficulty: hard

Ask the candidate to explain: how TypeScript's structural type system differs from
nominal typing, how the infer keyword works in conditional types, what covariant
and contravariant positions mean for function types, or how template literal types
are resolved.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PYTHON
  // ════════════════════════════════════════════════════════════════════════════

  'python__beginner__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one BEGINNER-level MCQ for a Python developer assessment.
Concept to test: {concept}
Difficulty: easy

Test foundational Python knowledge (< 6 months): variables, basic data types,
control flow, simple functions, list/dict operations, string formatting, file I/O.
A short code snippet is encouraged. Distractors should target common beginner
Python mistakes (mutable defaults, indentation, 0-based indexing).

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'python__intermediate__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level MCQ for a Python developer assessment.
Concept to test: {concept}
Difficulty: medium

Test Python proficiency (1–3 years): OOP, decorators, generators, context managers,
comprehensions, type hints, asyncio basics, pytest. Include a meaningful code snippet.
Distractors should reflect common intermediate Python pitfalls.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'python__advanced__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level MCQ for a Python developer assessment.
Concept to test: {concept}
Difficulty: hard

Test deep Python expertise: metaclasses, descriptors, GIL and concurrency,
CPython internals, memory management, C extensions, advanced async patterns.
The question should involve subtle behaviour that separates experts from intermediates.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'python__beginner__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one BEGINNER-level scenario question for a Python assessment.
Concept to test: {concept}
Difficulty: easy

Describe a simple situation a junior Python developer faces: debugging a NameError,
choosing the right collection type, fixing an off-by-one error, or handling a
missing key in a dict. All options should be beginner-plausible.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'python__intermediate__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level scenario question for a Python assessment.
Concept to test: {concept}
Difficulty: medium

Describe a realistic Python production situation: mutable default argument bug,
generator exhaustion, decorator ordering issue, async/await deadlock, or
pytest fixture scope problem. All options should represent plausible solutions.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'python__advanced__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level scenario question for a Python assessment.
Concept to test: {concept}
Difficulty: hard

Describe a complex Python production situation: metaclass conflict, descriptor
resolution order, GIL-induced race condition, memory leak from circular references,
or CPython-specific behaviour difference between PyPy. Options should require
deep expertise to evaluate correctly.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'python__intermediate__micro-theory': {
    system: MICRO_THEORY_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level micro-theory question for a Python assessment.
Concept to test: {concept}
Difficulty: medium

Ask the candidate to explain a Python concept in 2–4 sentences: how decorators
work as higher-order functions, the difference between generators and iterators,
how the GIL affects multithreaded code, or what a context manager's __exit__
receives and how it handles exceptions.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'python__advanced__micro-theory': {
    system: MICRO_THEORY_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level micro-theory question for a Python assessment.
Concept to test: {concept}
Difficulty: hard

Ask the candidate to explain: how Python's MRO (C3 linearisation) resolves
diamond inheritance, how CPython's reference counting and cyclic garbage collector
interact, how descriptors underpin attribute access, or how asyncio's event loop
schedules coroutines vs callbacks.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // POSTGRESQL
  // ════════════════════════════════════════════════════════════════════════════

  'postgresql__beginner__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one BEGINNER-level MCQ for a PostgreSQL developer assessment.
Concept to test: {concept}
Difficulty: easy

Test foundational SQL/PostgreSQL knowledge (< 6 months): SELECT, WHERE, JOINs,
GROUP BY, basic data types, INSERT/UPDATE/DELETE, simple constraints. Include
a short SQL snippet. Distractors should target common beginner SQL mistakes.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'postgresql__intermediate__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level MCQ for a PostgreSQL developer assessment.
Concept to test: {concept}
Difficulty: medium

Test PostgreSQL proficiency (1–3 years): indexes, CTEs, window functions,
JSONB operators, transactions and isolation levels, PL/pgSQL functions,
EXPLAIN ANALYZE. Include a SQL snippet. Distractors should reflect common
intermediate PostgreSQL misunderstandings.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'postgresql__advanced__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level MCQ for a PostgreSQL developer assessment.
Concept to test: {concept}
Difficulty: hard

Test deep PostgreSQL expertise: query planner internals, MVCC, table partitioning,
logical replication, VACUUM behaviour, row-level security, custom types, FDWs.
The question should reveal deep understanding of PostgreSQL internals.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'postgresql__beginner__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one BEGINNER-level scenario question for a PostgreSQL assessment.
Concept to test: {concept}
Difficulty: easy

Describe a simple situation a junior SQL developer faces: choosing the right JOIN type,
fixing a GROUP BY error, adding a missing index hint, or resolving a NULL comparison
bug. All options should be beginner-plausible SQL decisions.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'postgresql__intermediate__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level scenario question for a PostgreSQL assessment.
Concept to test: {concept}
Difficulty: medium

Describe a realistic PostgreSQL production situation: a slow query needing an index,
a deadlock between two transactions, choosing between embedding in JSONB vs separate
table, or fixing a window function partition that produces wrong results.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'postgresql__advanced__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level scenario question for a PostgreSQL assessment.
Concept to test: {concept}
Difficulty: hard

Describe a complex PostgreSQL production situation: table bloat from high-churn
updates, logical replication lag, row-level security policy conflict, partitioned
table query not pruning, or a query regression after a statistics refresh.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'postgresql__intermediate__micro-theory': {
    system: MICRO_THEORY_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level micro-theory question for a PostgreSQL assessment.
Concept to test: {concept}
Difficulty: medium

Ask the candidate to explain a PostgreSQL concept in 2–4 sentences: how MVCC works
and why it avoids read locks, the difference between clustered and non-clustered
indexes (and which PostgreSQL uses), how window functions differ from GROUP BY, or
what a CTE fence is and when it matters.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'postgresql__advanced__micro-theory': {
    system: MICRO_THEORY_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level micro-theory question for a PostgreSQL assessment.
Concept to test: {concept}
Difficulty: hard

Ask the candidate to explain: how PostgreSQL's MVCC generates dead tuples and why
VACUUM is needed, how logical replication differs from physical replication and
its limitations, how the query planner uses statistics to choose between seq scan
and index scan, or what write-ahead logging (WAL) achieves and its role in crash recovery.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // DOCKER
  // ════════════════════════════════════════════════════════════════════════════

  'docker__beginner__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one BEGINNER-level MCQ for a Docker developer assessment.
Concept to test: {concept}
Difficulty: easy

Test foundational Docker knowledge (< 6 months): docker run/pull/push, basic
Dockerfile instructions (FROM, RUN, COPY, CMD), port publishing, named volumes,
docker-compose up/down. Include a short Dockerfile or CLI snippet.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'docker__intermediate__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level MCQ for a Docker developer assessment.
Concept to test: {concept}
Difficulty: medium

Test Docker proficiency (1–3 years): multi-stage builds, Docker Compose advanced
features, networking modes, security hardening (non-root users, read-only rootfs),
image optimisation, logging drivers. Include a Dockerfile or compose snippet.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'docker__advanced__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level MCQ for a Docker developer assessment.
Concept to test: {concept}
Difficulty: hard

Test deep Docker/container expertise: cgroups and namespaces, OCI runtime spec,
BuildKit internals, rootless Docker, containerd architecture, overlay filesystem.
The question should require knowledge of Linux container primitives.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'docker__beginner__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one BEGINNER-level scenario question for a Docker assessment.
Concept to test: {concept}
Difficulty: easy

Describe a simple situation a junior developer faces with Docker: a container that
exits immediately, a port not being accessible from the host, a volume not
persisting data, or a Dockerfile that fails to find a COPY source. All options
should be beginner-plausible Docker decisions.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'docker__intermediate__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level scenario question for a Docker assessment.
Concept to test: {concept}
Difficulty: medium

Describe a realistic Docker production situation: cache invalidation causing
slow builds, a container running as root posing a security risk, two services
unable to communicate over a custom network, or a multi-stage build not reducing
image size as expected.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'docker__advanced__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level scenario question for a Docker assessment.
Concept to test: {concept}
Difficulty: hard

Describe a complex container production situation: OOM kill investigation with
cgroup memory limits, overlayfs performance degradation, BuildKit cache mount
not being shared between CI runners, or a rootless Docker setup failing due to
user namespace limits.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'docker__intermediate__micro-theory': {
    system: MICRO_THEORY_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level micro-theory question for a Docker assessment.
Concept to test: {concept}
Difficulty: medium

Ask the candidate to explain a Docker concept in 2–4 sentences: how layer caching
works and what invalidates it, the difference between ENTRYPOINT and CMD, how
Docker networking enables container-to-container communication, or why multi-stage
builds reduce image size.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'docker__advanced__micro-theory': {
    system: MICRO_THEORY_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level micro-theory question for a Docker assessment.
Concept to test: {concept}
Difficulty: hard

Ask the candidate to explain: how Linux namespaces and cgroups together implement
container isolation, how OverlayFS provides copy-on-write semantics for container
layers, what the OCI runtime spec defines and how runc implements it, or how
BuildKit's cache mounts differ from regular build cache.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // GRAPHQL
  // ════════════════════════════════════════════════════════════════════════════

  'graphql__beginner__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one BEGINNER-level MCQ for a GraphQL developer assessment.
Concept to test: {concept}
Difficulty: easy

Test foundational GraphQL knowledge (< 6 months): schema definition language,
queries, mutations, basic resolver structure, arguments, variables, introspection.
Include a short SDL or query snippet. Distractors should target common beginner
GraphQL misunderstandings (REST vs GraphQL, over-fetching).

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'graphql__intermediate__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level MCQ for a GraphQL developer assessment.
Concept to test: {concept}
Difficulty: medium

Test GraphQL proficiency (1–3 years): DataLoader and N+1, subscriptions,
authentication in context, pagination (cursor-based vs offset), custom directives,
Apollo Federation basics, caching strategies. Include a resolver or schema snippet.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'graphql__advanced__mcq': {
    system: MCQ_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level MCQ for a GraphQL developer assessment.
Concept to test: {concept}
Difficulty: hard

Test deep GraphQL expertise: execution engine internals, @defer/@stream, federation
v2 advanced features, schema stitching vs federation, query complexity analysis,
custom scalars, contract testing. The question should reveal deep API platform expertise.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'graphql__beginner__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one BEGINNER-level scenario question for a GraphQL assessment.
Concept to test: {concept}
Difficulty: easy

Describe a simple situation a junior GraphQL developer faces: a resolver returning
null unexpectedly, a mutation missing required input fields, a query variable not
being passed correctly, or a type mismatch in the schema. All options should be
beginner-plausible.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'graphql__intermediate__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level scenario question for a GraphQL assessment.
Concept to test: {concept}
Difficulty: medium

Describe a realistic GraphQL production situation: N+1 queries causing slow API
responses, a subscription dropping events under load, a context object missing
authentication headers, or a cursor-based pagination implementation that returns
duplicate results.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'graphql__advanced__scenario': {
    system: SCENARIO_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level scenario question for a GraphQL assessment.
Concept to test: {concept}
Difficulty: hard

Describe a complex GraphQL production situation: a federation entity resolver
returning null causing gateway query failure, a custom directive breaking schema
validation, @defer causing client rendering issues, or a query complexity limit
incorrectly throttling legitimate queries.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'graphql__intermediate__micro-theory': {
    system: MICRO_THEORY_SYSTEM_CONTRACT,
    user: `
Generate one INTERMEDIATE-level micro-theory question for a GraphQL assessment.
Concept to test: {concept}
Difficulty: medium

Ask the candidate to explain a GraphQL concept in 2–4 sentences: how DataLoader
solves the N+1 problem, the difference between interfaces and unions in GraphQL,
how subscriptions differ from queries and mutations at the transport level, or
why cursor-based pagination is preferred over offset pagination.

${UNIQUENESS_FOOTER}
    `.trim(),
  },

  'graphql__advanced__micro-theory': {
    system: MICRO_THEORY_SYSTEM_CONTRACT,
    user: `
Generate one ADVANCED-level micro-theory question for a GraphQL assessment.
Concept to test: {concept}
Difficulty: hard

Ask the candidate to explain: how GraphQL's execution engine resolves fields
concurrently, what the Apollo Federation @key directive enables and how entity
resolvers work across subgraphs, how @defer and @stream enable incremental
delivery, or what query cost analysis calculates and how it prevents abuse.

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
