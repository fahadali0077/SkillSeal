// ─────────────────────────────────────────────────────────────────────────────
// conceptLibrary.ts
// Curated concept pools used for question generation.
// Each tier has exactly 8 concepts (expandable).
// Used by questionGenerator.ts to fill the {concept} template slot and
// by the session engine to track which concepts have already been covered.
// ─────────────────────────────────────────────────────────────────────────────

import type { SkillTier } from '@SkillSeal/shared';

// ── Internal types ────────────────────────────────────────────────────────────

export interface ConceptEntry {
  id: string;          // stable slug used in sessionHistory
  label: string;       // human-readable, injected into prompts
  description: string; // one-line context to steer the AI
}

export type ConceptLibrary = Record<SkillTier, ConceptEntry[]>;

// ─────────────────────────────────────────────────────────────────────────────
// React
// ─────────────────────────────────────────────────────────────────────────────

export const REACT_CONCEPTS: ConceptLibrary = {
  beginner: [
    {
      id: 'jsx-basics',
      label: 'JSX Syntax & Expressions',
      description: 'Writing JSX, embedding expressions, fragments, and JSX rules vs HTML',
    },
    {
      id: 'functional-components',
      label: 'Functional Components',
      description: 'Defining, exporting, and rendering function components with props',
    },
    {
      id: 'props',
      label: 'Props & PropTypes',
      description: 'Passing, destructuring, defaulting props; children prop; prop drilling basics',
    },
    {
      id: 'useState',
      label: 'useState Hook',
      description: 'Declaring state, updater functions, batching, stale closures',
    },
    {
      id: 'event-handling',
      label: 'Event Handling',
      description: 'Synthetic events, onClick/onChange, preventing defaults, event delegation',
    },
    {
      id: 'conditional-rendering',
      label: 'Conditional Rendering',
      description: '&&, ternary, early returns, null rendering, show/hide patterns',
    },
    {
      id: 'lists-keys',
      label: 'Lists & Keys',
      description: 'Array.map in JSX, stable unique keys, index-as-key pitfalls',
    },
    {
      id: 'basic-forms',
      label: 'Controlled vs Uncontrolled Inputs',
      description: 'value/onChange pattern, refs for uncontrolled, form submission',
    },
  ],

  intermediate: [
    {
      id: 'useEffect',
      label: 'useEffect & Lifecycle',
      description: 'Dependency array rules, cleanup functions, avoiding infinite loops',
    },
    {
      id: 'useRef',
      label: 'useRef & DOM Access',
      description: 'Mutable refs, forwarding refs, imperativeHandle, avoiding stale closures',
    },
    {
      id: 'useContext',
      label: 'Context API & useContext',
      description: 'Creating context, Provider placement, avoiding unnecessary re-renders',
    },
    {
      id: 'useMemo-useCallback',
      label: 'useMemo & useCallback',
      description: 'Memoization rationale, dependency comparison, over-optimization pitfalls',
    },
    {
      id: 'custom-hooks',
      label: 'Custom Hooks',
      description: 'Extracting stateful logic, rules of hooks, naming conventions',
    },
    {
      id: 'component-composition',
      label: 'Component Composition Patterns',
      description: 'Compound components, render props, slot pattern, HOCs',
    },
    {
      id: 'react-router',
      label: 'React Router v6',
      description: 'Routes, loaders, nested routes, useNavigate, useParams, Outlet',
    },
    {
      id: 'error-boundaries',
      label: 'Error Boundaries',
      description: 'Class-based error boundaries, react-error-boundary, fallback UI',
    },
  ],

  advanced: [
    {
      id: 'concurrent-mode',
      label: 'Concurrent Rendering & Transitions',
      description: 'useTransition, useDeferredValue, Suspense, startTransition semantics',
    },
    {
      id: 'reconciliation',
      label: 'Reconciliation & Fiber',
      description: 'Diffing algorithm, fiber tree, work loops, priority lanes',
    },
    {
      id: 'performance-profiling',
      label: 'Performance Profiling & Optimization',
      description: 'React DevTools Profiler, flame graphs, avoiding wasteful renders',
    },
    {
      id: 'server-components',
      label: 'React Server Components',
      description: 'RSC vs RCC boundary, serializable props, server actions, streaming',
    },
    {
      id: 'state-architecture',
      label: 'State Architecture at Scale',
      description: 'Zustand vs Redux Toolkit, derived state, atom-based state, colocation',
    },
    {
      id: 'code-splitting',
      label: 'Code Splitting & Lazy Loading',
      description: 'React.lazy, Suspense fallbacks, route-level splitting, prefetching',
    },
    {
      id: 'testing',
      label: 'Testing React Components',
      description: 'React Testing Library, user-event, mocking hooks, async queries',
    },
    {
      id: 'accessibility',
      label: 'Accessibility (a11y) in React',
      description: 'ARIA roles, focus management, keyboard nav, screen-reader testing',
    },
  ],

  expert: [
    {
      id: 'react-internals',
      label: 'React Internals & Custom Renderers',
      description: 'react-reconciler, host config, building a custom renderer',
    },
    {
      id: 'streaming-ssr',
      label: 'Streaming SSR & Selective Hydration',
      description: 'renderToPipeableStream, out-of-order hydration, partial hydration',
    },
    {
      id: 'compiler',
      label: 'React Compiler (React Forget)',
      description: 'Automatic memoization, compiler assumptions, escape hatches',
    },
    {
      id: 'micro-frontends',
      label: 'Micro-Frontends with React',
      description: 'Module federation, shared dependencies, isolation strategies',
    },
    {
      id: 'animation-internals',
      label: 'Animation Systems & Layout Effects',
      description: 'useLayoutEffect timing, FLIP technique, react-spring internals',
    },
    {
      id: 'metaframework-internals',
      label: 'Next.js / Remix Internals',
      description: 'App Router architecture, flight protocol, loaders vs server actions',
    },
    {
      id: 'design-systems',
      label: 'Design System Architecture',
      description: 'Polymorphic components, compound variants, token-driven theming',
    },
    {
      id: 'security',
      label: 'React Security Patterns',
      description: 'XSS via dangerouslySetInnerHTML, CSP, dependency auditing, SSR injection',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Node.js
// ─────────────────────────────────────────────────────────────────────────────

export const NODEJS_CONCEPTS: ConceptLibrary = {
  beginner: [
    { id: 'node-modules', label: 'Node.js Module System (CJS/ESM)', description: 'require vs import, exports, __dirname, package.json type field' },
    { id: 'fs-module', label: 'File System (fs) Module', description: 'readFile, writeFile, sync vs async, streams basics' },
    { id: 'http-module', label: 'Built-in HTTP Module', description: 'createServer, IncomingMessage, ServerResponse, status codes' },
    { id: 'npm-basics', label: 'npm & package.json', description: 'dependencies vs devDependencies, scripts, semver, lock files' },
    { id: 'callbacks', label: 'Callbacks & Error-first Pattern', description: 'Node error-first convention, callback hell, typical pitfalls' },
    { id: 'env-vars', label: 'Environment Variables', description: 'process.env, dotenv, NODE_ENV conventions' },
    { id: 'path-module', label: 'path Module', description: 'join, resolve, dirname, extname, cross-platform differences' },
    { id: 'process-object', label: 'process Object', description: 'argv, exit codes, signals, stdout/stderr, nextTick' },
  ],
  intermediate: [
    { id: 'event-loop', label: 'Event Loop & Phases', description: 'timers, poll, check phases, setImmediate vs setTimeout' },
    { id: 'streams', label: 'Streams & Backpressure', description: 'Readable, Writable, Transform, pipe, highWaterMark' },
    { id: 'express-middleware', label: 'Express Middleware Pipeline', description: 'next(), error middleware, order, router-level vs app-level' },
    { id: 'async-patterns', label: 'Async/Await & Promise Patterns', description: 'Promise.all, allSettled, race, error propagation' },
    { id: 'worker-threads', label: 'Worker Threads', description: 'CPU-bound tasks, SharedArrayBuffer, MessageChannel' },
    { id: 'cluster', label: 'Cluster Module', description: 'fork, IPC, load balancing strategies, pm2 internals' },
    { id: 'buffers', label: 'Buffers & Binary Data', description: 'Buffer.alloc, encoding, ArrayBuffer, TypedArrays' },
    { id: 'child-processes', label: 'Child Processes', description: 'spawn vs exec vs fork, stdio piping, shell injection risks' },
  ],
  advanced: [
    { id: 'performance-hooks', label: 'Performance Measurement', description: 'perf_hooks, PerformanceObserver, async_hooks for tracing' },
    { id: 'native-addons', label: 'Native Addons & N-API', description: 'node-gyp, N-API stability, when to use native vs JS' },
    { id: 'security-node', label: 'Node.js Security', description: 'prototype pollution, ReDoS, SSRF, secure headers, auditing' },
    { id: 'diagnostics', label: 'Diagnostics & Debugging', description: '--inspect, heap snapshots, CPU profiling, core dumps' },
    { id: 'esm-interop', label: 'ESM / CJS Interoperability', description: 'dual packages, .mjs, dynamic import(), named exports in CJS' },
    { id: 'caching-strategies', label: 'Caching Strategies', description: 'Redis integration, in-memory LRU, cache invalidation, TTL' },
    { id: 'graceful-shutdown', label: 'Graceful Shutdown', description: 'SIGTERM handler, draining connections, health checks' },
    { id: 'rate-limiting', label: 'Rate Limiting & Throttling', description: 'token bucket, sliding window, Redis-backed limiters' },
  ],
  expert: [
    { id: 'libuv', label: 'libuv Internals', description: 'I/O completion ports, thread pool, handle vs request' },
    { id: 'v8-internals', label: 'V8 Engine Optimizations', description: 'hidden classes, inline caching, deoptimization, GC tuning' },
    { id: 'opentelemetry', label: 'OpenTelemetry & Distributed Tracing', description: 'spans, context propagation, OTLP export, baggage' },
    { id: 'custom-protocols', label: 'Custom Binary Protocols', description: 'Protocol Buffers, MessagePack, framing, efficient serialization' },
    { id: 'serverless-node', label: 'Node.js in Serverless', description: 'cold starts, Lambda layers, bundling, execution context reuse' },
    { id: 'wasm-node', label: 'WebAssembly in Node.js', description: 'WASI, wasm instantiation, memory model, use cases' },
    { id: 'plugin-systems', label: 'Plugin & Extension Systems', description: 'fastify plugins, hook systems, inversion of control' },
    { id: 'event-sourcing', label: 'Event Sourcing with Node.js', description: 'append-only logs, projections, EventStoreDB, replay' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// MongoDB
// ─────────────────────────────────────────────────────────────────────────────

export const MONGODB_CONCEPTS: ConceptLibrary = {
  beginner: [
    { id: 'crud-basics', label: 'CRUD Operations', description: 'insertOne/Many, findOne/find, updateOne, deleteOne with filters' },
    { id: 'query-operators', label: 'Query Operators', description: '$eq, $gt, $in, $and, $or, $regex, $exists' },
    { id: 'document-model', label: 'Document Data Model', description: 'BSON types, _id, nested documents, arrays vs embedded docs' },
    { id: 'projections', label: 'Projections & Field Selection', description: 'include/exclude fields, 0/1 projection, $slice, $ operator' },
    { id: 'sorting-limiting', label: 'Sorting, Limiting & Skipping', description: 'cursor methods, sort() direction, limit/skip for pagination' },
    { id: 'update-operators', label: 'Update Operators', description: '$set, $unset, $push, $pull, $inc, $addToSet, upsert' },
    { id: 'collections', label: 'Collections & Databases', description: 'creating collections, capped collections, naming conventions' },
    { id: 'mongoose-basics', label: 'Mongoose Schema & Model', description: 'Schema types, required/default, model methods, document save' },
  ],
  intermediate: [
    { id: 'aggregation', label: 'Aggregation Pipeline', description: '$match, $group, $project, $lookup, $unwind, $facet stages' },
    { id: 'indexes', label: 'Indexes & Query Planning', description: 'single, compound, text, sparse, partial; explain() plan analysis' },
    { id: 'transactions', label: 'Multi-document Transactions', description: 'ACID guarantees, session, commitTransaction, retry logic' },
    { id: 'schema-design', label: 'Schema Design Patterns', description: 'embed vs reference, polymorphic, bucket, outlier patterns' },
    { id: 'change-streams', label: 'Change Streams', description: 'watch(), resumeToken, filtering events, real-time use cases' },
    { id: 'atlas-search', label: 'Atlas Search & Full-text', description: 'Lucene indexes, $search stage, autocomplete, scoring' },
    { id: 'validation', label: 'Schema Validation & JSON Schema', description: 'validator option, $jsonSchema, validationAction/Level' },
    { id: 'mongoose-advanced', label: 'Mongoose Middleware & Virtuals', description: 'pre/post hooks, virtuals, discriminators, populate' },
  ],
  advanced: [
    { id: 'sharding', label: 'Sharding & Horizontal Scaling', description: 'shard keys, hashed vs range, chunk migration, mongos' },
    { id: 'replica-sets', label: 'Replica Sets & Read Preferences', description: 'primary/secondary, elections, writeConcern, readPreference' },
    { id: 'wiredtiger', label: 'WiredTiger Storage Engine', description: 'document-level locking, compression, cache management, checkpoints' },
    { id: 'performance-tuning', label: 'Performance Tuning', description: 'index intersection, covered queries, query hints, profiler' },
    { id: 'data-modeling-at-scale', label: 'Data Modeling at Scale', description: 'unbounded arrays, document growth, power-of-two sizing' },
    { id: 'atlas-triggers', label: 'Atlas Triggers & Functions', description: 'database triggers, scheduled triggers, serverless functions' },
    { id: 'encryption', label: 'Field-Level & In-Use Encryption', description: 'CSFLE, queryable encryption, key management, data masking' },
    { id: 'time-series', label: 'Time Series Collections', description: 'timeField, metaField, granularity, automatic bucketing, window functions' },
  ],
  expert: [
    { id: 'oplog', label: 'Oplog & Replication Internals', description: 'oplog format, idempotency, oplog window, lag monitoring' },
    { id: 'custom-storage', label: 'Pluggable Storage Engine API', description: 'KVEngine interface, custom engine trade-offs, in-memory engine' },
    { id: 'distributed-transactions', label: 'Distributed Transactions at Scale', description: 'cross-shard transactions, performance cost, patterns to avoid them' },
    { id: 'atlas-data-federation', label: 'Atlas Data Federation', description: 'federated queries across S3/Atlas, virtual collections, SQL interface' },
    { id: 'observability', label: 'MongoDB Observability & Ops', description: 'mongostat, mongotop, db.currentOp(), slow query analysis' },
    { id: 'vector-search', label: 'Vector Search ($vectorSearch)', description: 'embedding storage, ANN index (HNSW), hybrid search, RAG patterns' },
    { id: 'queryable-encryption-advanced', label: 'Queryable Encryption Internals', description: 'ORCA protocol, encrypted indexes, key rotation, compliance' },
    { id: 'multitenancy', label: 'Multi-tenancy Patterns', description: 'database-per-tenant, collection-per-tenant, discriminator field' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry — used by questionGenerator to look up the right library
// ─────────────────────────────────────────────────────────────────────────────

export type SupportedSkill = 'react' | 'nodejs' | 'mongodb';

export const CONCEPT_REGISTRY: Record<SupportedSkill, ConceptLibrary> = {
  react: REACT_CONCEPTS,
  nodejs: NODEJS_CONCEPTS,
  mongodb: MONGODB_CONCEPTS,
};

/**
 * Returns concepts for a given skill + tier, excluding any already covered
 * in the current session (by concept id).
 */
export function getAvailableConcepts(
  skill: SupportedSkill,
  tier: SkillTier,
  usedConceptIds: string[] = []
): ConceptEntry[] {
  const library = CONCEPT_REGISTRY[skill];
  if (!library) return [];
  const tierConcepts = library[tier] ?? [];
  const used = new Set(usedConceptIds);
  return tierConcepts.filter((c) => !used.has(c.id));
}

/**
 * Picks a pseudo-random concept from the available pool.
 * Falls back to the full tier list if all concepts are exhausted.
 */
export function pickConcept(
  skill: SupportedSkill,
  tier: SkillTier,
  usedConceptIds: string[] = [],
  seed: number = Date.now()
): ConceptEntry {
  let pool = getAvailableConcepts(skill, tier, usedConceptIds);
  // Fallback: allow repeats if all concepts have been used
  if (pool.length === 0) {
    pool = CONCEPT_REGISTRY[skill]?.[tier] ?? [];
  }
  const index = seed % pool.length;
  return pool[index];
}
