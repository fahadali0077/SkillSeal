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


export const TYPESCRIPT_CONCEPTS: ConceptLibrary = {
  beginner: [
    { id: 'ts-basic-types',        label: 'Basic Types',               description: 'string, number, boolean, null, undefined, any, unknown' },
    { id: 'ts-type-annotations',   label: 'Type Annotations',          description: 'Annotating variables, function parameters, and return types' },
    { id: 'ts-interfaces',         label: 'Interfaces',                description: 'Defining object shapes, optional & readonly properties' },
    { id: 'ts-type-aliases',       label: 'Type Aliases',              description: 'type keyword, union types, intersection types basics' },
    { id: 'ts-enums',              label: 'Enums',                     description: 'Numeric and string enums, const enums, reverse mapping' },
    { id: 'ts-arrays-tuples',      label: 'Arrays & Tuples',           description: 'Typed arrays, readonly arrays, tuple types and labels' },
    { id: 'ts-functions',          label: 'Typed Functions',           description: 'Function signatures, optional params, default values, overloads basics' },
    { id: 'ts-type-assertions',    label: 'Type Assertions & Guards',  description: 'as keyword, non-null assertion, typeof and instanceof guards' },
  ],
  intermediate: [
    { id: 'ts-generics',           label: 'Generics',                  description: 'Generic functions, interfaces, constraints, default type parameters' },
    { id: 'ts-utility-types',      label: 'Utility Types',             description: 'Partial, Required, Pick, Omit, Record, ReturnType, Parameters' },
    { id: 'ts-mapped-types',       label: 'Mapped Types',              description: 'keyof, in operator, conditional types, infer keyword' },
    { id: 'ts-discriminated-union',label: 'Discriminated Unions',      description: 'Tagged unions, exhaustiveness checking, never type narrowing' },
    { id: 'ts-declaration-files',  label: 'Declaration Files',         description: '.d.ts files, module augmentation, @types packages, ambient modules' },
    { id: 'ts-classes',            label: 'Classes & Access Modifiers',description: 'public/private/protected, abstract classes, implements, readonly' },
    { id: 'ts-modules',            label: 'Modules & Namespaces',      description: 'ES module imports/exports, namespace merging, re-exports' },
    { id: 'ts-strict-mode',        label: 'Strict Mode & tsconfig',    description: 'strictNullChecks, noImplicitAny, tsconfig paths, project references' },
  ],
  advanced: [
    { id: 'ts-conditional-types',  label: 'Conditional Types',         description: 'Distributive conditional types, infer in conditionals, recursive types' },
    { id: 'ts-template-literal',   label: 'Template Literal Types',    description: 'String manipulation types, Uppercase/Lowercase, Key remapping' },
    { id: 'ts-variance',           label: 'Variance & Covariance',     description: 'Covariant/contravariant positions, function parameter types, readonly arrays' },
    { id: 'ts-decorators',         label: 'Decorators',                description: 'Class, method, property decorators, metadata reflection' },
    { id: 'ts-type-narrowing',     label: 'Advanced Narrowing',        description: 'Control flow analysis, assertion functions, satisfies operator' },
    { id: 'ts-builder-patterns',   label: 'Builder & Fluent Patterns', description: 'Method chaining with generics, branded types, phantom types' },
    { id: 'ts-performance',        label: 'Type Performance',          description: 'Avoiding type instantiation depth, lazy types, type caching pitfalls' },
    { id: 'ts-module-augmentation',label: 'Module Augmentation',       description: 'Augmenting third-party types, global augmentation, interface merging' },
  ],
  expert: [
    { id: 'ts-hkt',                label: 'Higher-Kinded Types',       description: 'Simulating HKTs in TypeScript, encoding type-level computation' },
    { id: 'ts-type-level-prog',    label: 'Type-Level Programming',    description: 'Type-level arithmetic, string parsing, recursive mapped types' },
    { id: 'ts-compiler-api',       label: 'TypeScript Compiler API',   description: 'ts.Node, transformers, language service plugins, AST traversal' },
    { id: 'ts-declaration-merging',label: 'Complex Declaration Merging',description: 'Interface & namespace merging edge cases, global scope augmentation' },
    { id: 'ts-ecosystem',          label: 'TypeScript Ecosystem',      description: 'tsc vs Babel, ts-node, esbuild, swc, monorepo tsconfig strategies' },
    { id: 'ts-error-handling',     label: 'Type-Safe Error Handling',  description: 'Result/Either types, typed throws, error discrimination patterns' },
    { id: 'ts-generics-advanced',  label: 'Advanced Generic Patterns', description: 'Recursive generics, variadic tuple types, spread generics' },
    { id: 'ts-performance-opt',    label: 'Compiler Performance Opt.', description: 'Project references, incremental builds, isolatedModules, skipLibCheck' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Python
// ─────────────────────────────────────────────────────────────────────────────

export const PYTHON_CONCEPTS: ConceptLibrary = {
  beginner: [
    { id: 'py-variables',          label: 'Variables & Data Types',    description: 'int, float, str, bool, None; dynamic typing; type() function' },
    { id: 'py-control-flow',       label: 'Control Flow',              description: 'if/elif/else, for/while loops, break/continue/pass, range()' },
    { id: 'py-functions',          label: 'Functions',                 description: 'def, return, default args, *args, **kwargs, docstrings' },
    { id: 'py-lists-dicts',        label: 'Lists, Dicts & Sets',       description: 'List/dict/set operations, indexing, slicing, methods' },
    { id: 'py-strings',            label: 'String Manipulation',       description: 'f-strings, methods, slicing, format(), encoding basics' },
    { id: 'py-file-io',            label: 'File I/O',                  description: 'open(), with statement, read/write modes, csv module' },
    { id: 'py-exceptions',         label: 'Exceptions & Error Handling',description: 'try/except/finally, raising exceptions, custom exception classes' },
    { id: 'py-modules',            label: 'Modules & Imports',         description: 'import, from…import, __name__, pip, virtual environments' },
  ],
  intermediate: [
    { id: 'py-oop',                label: 'OOP & Classes',             description: '__init__, self, inheritance, super(), dunder methods, @property' },
    { id: 'py-comprehensions',     label: 'Comprehensions & Generators',description: 'List/dict/set comprehensions, generator expressions, yield, yield from' },
    { id: 'py-decorators',         label: 'Decorators',                description: 'functools.wraps, class decorators, stacking decorators, @staticmethod/@classmethod' },
    { id: 'py-itertools',          label: 'Iterators & itertools',     description: 'iter/next protocol, itertools.chain/groupby/product/combinations' },
    { id: 'py-context-managers',   label: 'Context Managers',          description: '__enter__/__exit__, contextlib.contextmanager, nested contexts' },
    { id: 'py-type-hints',         label: 'Type Hints & mypy',         description: 'PEP 484/526, Optional, Union, List, Dict, TypeVar, Protocol' },
    { id: 'py-async',              label: 'Asyncio & Async/Await',     description: 'async def, await, event loop, asyncio.gather, Task, Queue' },
    { id: 'py-testing',            label: 'Testing with pytest',       description: 'fixtures, parametrize, monkeypatch, coverage, mocking' },
  ],
  advanced: [
    { id: 'py-metaclasses',        label: 'Metaclasses',               description: 'type(), __new__, __init_subclass__, class factories, ABCMeta' },
    { id: 'py-descriptors',        label: 'Descriptors',               description: '__get__/__set__/__delete__, data vs non-data descriptors, slots' },
    { id: 'py-memory',             label: 'Memory Management',         description: 'Reference counting, gc module, weakref, __slots__, memory profiling' },
    { id: 'py-concurrency',        label: 'Concurrency & GIL',         description: 'GIL implications, threading, multiprocessing, concurrent.futures' },
    { id: 'py-dataclasses',        label: 'Dataclasses & attrs',       description: '@dataclass, field(), __post_init__, frozen, comparison, slots' },
    { id: 'py-packaging',          label: 'Packaging & Distribution',  description: 'pyproject.toml, setuptools, wheels, entry points, namespace packages' },
    { id: 'py-c-extensions',       label: 'C Extensions & ctypes',     description: 'ctypes, cffi, Cython basics, Python/C API, performance optimisation' },
    { id: 'py-design-patterns',    label: 'Design Patterns in Python', description: 'Singleton, factory, observer, strategy using Pythonic idioms' },
  ],
  expert: [
    { id: 'py-internals',          label: 'CPython Internals',         description: 'Bytecode, code objects, frame evaluation, peephole optimiser' },
    { id: 'py-async-advanced',     label: 'Advanced Asyncio',          description: 'Custom event loops, protocols/transports, uvloop, anyio, Trio' },
    { id: 'py-import-system',      label: 'Import System',             description: 'sys.meta_path, importlib, custom finders/loaders, frozen modules' },
    { id: 'py-numeric',            label: 'Numeric Computing',         description: 'NumPy vectorisation, broadcasting, ufuncs, memoryview, BLAS calls' },
    { id: 'py-profiling',          label: 'Profiling & Optimisation',  description: 'cProfile, line_profiler, Py-Spy, algorithmic complexity, caching strategies' },
    { id: 'py-security',           label: 'Security Best Practices',   description: 'Pickle dangers, SSRF, injection, secrets module, bandit, SAST' },
    { id: 'py-distributed',        label: 'Distributed Systems',       description: 'Celery, Redis queues, gRPC in Python, service mesh patterns' },
    { id: 'py-type-advanced',      label: 'Advanced Type System',      description: 'TypeVarTuple, ParamSpec, Concatenate, runtime_checkable, Protocols' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// PostgreSQL
// ─────────────────────────────────────────────────────────────────────────────

export const POSTGRESQL_CONCEPTS: ConceptLibrary = {
  beginner: [
    { id: 'pg-select',             label: 'SELECT & Filtering',        description: 'WHERE, AND/OR/NOT, BETWEEN, IN, LIKE, ILIKE, IS NULL' },
    { id: 'pg-insert-update',      label: 'INSERT, UPDATE, DELETE',    description: 'DML statements, RETURNING clause, upsert with ON CONFLICT' },
    { id: 'pg-data-types',         label: 'Data Types',                description: 'integer, text, varchar, boolean, date, timestamp, UUID, JSONB' },
    { id: 'pg-joins',              label: 'JOINs',                     description: 'INNER, LEFT, RIGHT, FULL OUTER, CROSS joins, self-joins' },
    { id: 'pg-aggregate',          label: 'Aggregate Functions',       description: 'COUNT, SUM, AVG, MIN, MAX, GROUP BY, HAVING' },
    { id: 'pg-constraints',        label: 'Constraints',               description: 'PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL, CHECK, DEFAULT' },
    { id: 'pg-ordering',           label: 'Sorting & Limiting',        description: 'ORDER BY, ASC/DESC, NULLS FIRST/LAST, LIMIT, OFFSET, FETCH' },
    { id: 'pg-functions-basics',   label: 'Built-in Functions',        description: 'String, numeric, date/time functions, COALESCE, NULLIF, CAST' },
  ],
  intermediate: [
    { id: 'pg-indexes',            label: 'Indexes & Performance',     description: 'B-tree, Hash, GIN, BRIN indexes; EXPLAIN ANALYZE; index-only scans' },
    { id: 'pg-cte',                label: 'CTEs & Subqueries',         description: 'WITH, recursive CTEs, lateral joins, correlated subqueries' },
    { id: 'pg-window-functions',   label: 'Window Functions',          description: 'OVER, PARTITION BY, ORDER BY, ROW_NUMBER, RANK, LAG, LEAD' },
    { id: 'pg-transactions',       label: 'Transactions & Isolation',  description: 'BEGIN/COMMIT/ROLLBACK, savepoints, isolation levels, MVCC' },
    { id: 'pg-jsonb',              label: 'JSONB & JSON Operators',    description: '->, ->>, #>, @>, <@, jsonb_set, jsonb_agg, GIN indexes on JSONB' },
    { id: 'pg-stored-procedures',  label: 'Functions & Stored Procs',  description: 'PL/pgSQL, CREATE FUNCTION, triggers, EXECUTE, dollar quoting' },
    { id: 'pg-partitioning',       label: 'Table Partitioning',        description: 'RANGE, LIST, HASH partitioning, partition pruning, attach/detach' },
    { id: 'pg-schema-design',      label: 'Schema Design Patterns',    description: 'Normalisation, denormalisation trade-offs, polymorphic associations' },
  ],
  advanced: [
    { id: 'pg-query-planner',      label: 'Query Planner & Tuning',    description: 'Seq scan vs index scan, stats, pg_stats, planner cost constants' },
    { id: 'pg-replication',        label: 'Replication & HA',          description: 'Streaming replication, logical replication, hot standby, pgBouncer' },
    { id: 'pg-vacuum',             label: 'VACUUM & Bloat',            description: 'MVCC dead tuples, autovacuum, VACUUM FULL, table bloat monitoring' },
    { id: 'pg-extensions',         label: 'Extensions',                description: 'pg_trgm, pgcrypto, uuid-ossp, PostGIS, pg_cron, timescaledb' },
    { id: 'pg-security',           label: 'Security & RLS',            description: 'Row-level security, pg_hba.conf, SSL, roles, GRANT/REVOKE, audit' },
    { id: 'pg-full-text',          label: 'Full-Text Search',          description: 'tsvector, tsquery, GIN index, ts_rank, dictionaries, pg_trgm' },
    { id: 'pg-concurrency',        label: 'Locking & Concurrency',     description: 'Advisory locks, pg_locks, deadlocks, lock modes, FOR UPDATE SKIP LOCKED' },
    { id: 'pg-migrations',         label: 'Schema Migrations',         description: 'Zero-downtime migrations, Flyway/Liquibase/golang-migrate patterns' },
  ],
  expert: [
    { id: 'pg-internals',          label: 'PostgreSQL Internals',      description: 'Storage layout, heap file format, WAL, buffer pool, checkpoint' },
    { id: 'pg-custom-types',       label: 'Custom Types & Operators',  description: 'CREATE TYPE, composite types, domain types, operator classes' },
    { id: 'pg-fdw',                label: 'Foreign Data Wrappers',     description: 'postgres_fdw, file_fdw, custom FDW API, pushdown optimisation' },
    { id: 'pg-sharding',           label: 'Sharding & Citus',          description: 'Horizontal scaling, Citus distributed tables, colocation, routing' },
    { id: 'pg-monitoring',         label: 'Monitoring & Observability',description: 'pg_stat_* views, pg_activity, pgBadger, auto_explain, alerting' },
    { id: 'pg-backup',             label: 'Backup & PITR',             description: 'pg_dump, pg_basebackup, WAL archiving, point-in-time recovery' },
    { id: 'pg-logical-decoding',   label: 'Logical Decoding',          description: 'Replication slots, pgoutput, wal2json, CDC patterns, Debezium' },
    { id: 'pg-upgrade',            label: 'Major Version Upgrades',    description: 'pg_upgrade, logical replication upgrade path, downtime minimisation' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Docker
// ─────────────────────────────────────────────────────────────────────────────

export const DOCKER_CONCEPTS: ConceptLibrary = {
  beginner: [
    { id: 'dk-images-containers',  label: 'Images & Containers',       description: 'docker pull/run/stop/rm, image vs container, container lifecycle' },
    { id: 'dk-dockerfile-basics',  label: 'Dockerfile Basics',         description: 'FROM, RUN, COPY, ADD, CMD, ENTRYPOINT, WORKDIR, EXPOSE' },
    { id: 'dk-layers',             label: 'Layer Caching',             description: 'Union filesystem, layer ordering, cache invalidation, .dockerignore' },
    { id: 'dk-ports-volumes',      label: 'Ports & Volumes',           description: '-p flag, EXPOSE, bind mounts, named volumes, tmpfs mounts' },
    { id: 'dk-networking-basic',   label: 'Networking Basics',         description: 'bridge network, --network, port publishing, container DNS' },
    { id: 'dk-environment',        label: 'Environment Variables',     description: 'ENV, -e flag, .env files, ARG vs ENV, secret injection basics' },
    { id: 'dk-registries',         label: 'Registries & Tagging',      description: 'Docker Hub, docker push/pull, image tagging, private registries' },
    { id: 'dk-compose-basics',     label: 'Docker Compose Basics',     description: 'docker-compose.yml, services, depends_on, up/down/logs commands' },
  ],
  intermediate: [
    { id: 'dk-multi-stage',        label: 'Multi-Stage Builds',        description: 'COPY --from, builder pattern, minimising final image size' },
    { id: 'dk-compose-advanced',   label: 'Advanced Compose',          description: 'Profiles, healthchecks, override files, secrets, configs, deploy' },
    { id: 'dk-networking-adv',     label: 'Advanced Networking',       description: 'Custom networks, overlay networks, DNS resolution, --link vs networks' },
    { id: 'dk-security',           label: 'Container Security',        description: 'Non-root users, read-only rootfs, capabilities, seccomp, AppArmor' },
    { id: 'dk-storage-drivers',    label: 'Storage Drivers',           description: 'overlay2, devicemapper, btrfs; volume plugins; NFS mounts' },
    { id: 'dk-logging',            label: 'Logging Drivers',           description: 'json-file, syslog, fluentd, gelf, awslogs; log rotation' },
    { id: 'dk-image-optimisation', label: 'Image Optimisation',        description: 'Alpine base images, distroless, layer squashing, dive tool' },
    { id: 'dk-healthchecks',       label: 'Healthchecks & Restart',    description: 'HEALTHCHECK instruction, restart policies, depends_on condition' },
  ],
  advanced: [
    { id: 'dk-swarm',              label: 'Docker Swarm',              description: 'Swarm init, services, stacks, rolling updates, secrets, configs' },
    { id: 'dk-buildkit',           label: 'BuildKit & buildx',         description: 'DOCKER_BUILDKIT, cache mounts, SSH forwarding, multi-platform builds' },
    { id: 'dk-runtime',            label: 'Container Runtimes',        description: 'containerd, runc, CRI, gVisor, Kata containers, OCI spec' },
    { id: 'dk-rootless',           label: 'Rootless Docker',           description: 'Rootless mode, user namespaces, usernss remapping, security benefits' },
    { id: 'dk-cgroups',            label: 'cgroups & Resource Limits', description: '--memory, --cpu-shares, --cpuset-cpus, cgroups v2, OOM killer' },
    { id: 'dk-namespaces',         label: 'Linux Namespaces',          description: 'PID, network, mount, UTS, IPC, user namespaces; unshare' },
    { id: 'dk-compose-prod',       label: 'Compose in Production',     description: 'docker stack deploy, secrets management, environment-specific overrides' },
    { id: 'dk-debugging',          label: 'Debugging & Inspection',    description: 'docker exec, nsenter, docker inspect, strace in containers, OOM analysis' },
  ],
  expert: [
    { id: 'dk-oci-spec',           label: 'OCI Specification',         description: 'OCI image spec, runtime spec, distribution spec, image manifest' },
    { id: 'dk-containerd-api',     label: 'containerd API',            description: 'containerd gRPC API, snapshotter, content store, task management' },
    { id: 'dk-overlay-fs',         label: 'OverlayFS Deep Dive',       description: 'lowerdir/upperdir/workdir, copy-on-write, whiteouts, opaque dirs' },
    { id: 'dk-custom-runtime',     label: 'Custom OCI Runtimes',       description: 'Writing an OCI runtime, hooks, prestart/poststop, shimv2 protocol' },
    { id: 'dk-image-signing',      label: 'Image Signing & Trust',     description: 'Docker Content Trust, Notary v2, cosign, SLSA provenance' },
    { id: 'dk-ebpf',               label: 'eBPF & Container Observability', description: 'Cilium, Falco, bpftrace for container syscall tracing' },
    { id: 'dk-wasm',               label: 'WebAssembly in Docker',     description: 'WASM workloads via containerd-shim-wasmedge, runwasi, WasmEdge' },
    { id: 'dk-podman',             label: 'Podman & Daemonless',       description: 'Podman vs Docker, pods, systemd integration, buildah, skopeo' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// GraphQL
// ─────────────────────────────────────────────────────────────────────────────

export const GRAPHQL_CONCEPTS: ConceptLibrary = {
  beginner: [
    { id: 'gql-schema-basics',     label: 'Schema Definition Language', description: 'type, Query, Mutation, scalar types, !, lists, descriptions' },
    { id: 'gql-queries',           label: 'Queries & Fields',           description: 'Field selection, nested fields, aliases, fragments, operation names' },
    { id: 'gql-mutations',         label: 'Mutations',                  description: 'mutation keyword, input types, returning fields, side effects' },
    { id: 'gql-resolvers',         label: 'Resolver Basics',            description: 'Resolver function signature (root, args, context, info), resolver chain' },
    { id: 'gql-arguments',         label: 'Arguments & Variables',      description: 'Field arguments, query variables, variable types and defaults' },
    { id: 'gql-introspection',     label: 'Introspection',              description: '__schema, __type, GraphiQL/Playground, schema discovery' },
    { id: 'gql-errors',            label: 'Error Handling',             description: 'errors array, partial data, error extensions, error masking' },
    { id: 'gql-interfaces-unions', label: 'Interfaces & Unions',        description: 'interface keyword, union type, __resolveType, inline fragments' },
  ],
  intermediate: [
    { id: 'gql-dataloader',        label: 'DataLoader & N+1',          description: 'N+1 problem, batching, caching, DataLoader lifecycle, per-request caches' },
    { id: 'gql-subscriptions',     label: 'Subscriptions',             description: 'subscription keyword, WebSocket transport, PubSub, event-driven resolvers' },
    { id: 'gql-authentication',    label: 'Authentication & Context',  description: 'JWT in context, per-resolver auth checks, auth directives, shield' },
    { id: 'gql-pagination',        label: 'Pagination Patterns',       description: 'Cursor-based (Relay), offset-based, connection spec, PageInfo' },
    { id: 'gql-directives',        label: 'Custom Directives',         description: 'schema directives, @deprecated, @skip/@include, SchemaDirectiveVisitor' },
    { id: 'gql-federation',        label: 'Apollo Federation Basics',  description: '@key, @extends, @external, entity resolvers, gateway, subgraphs' },
    { id: 'gql-schema-design',     label: 'Schema Design Principles',  description: 'Nullable vs non-null, input vs output types, versioning strategies' },
    { id: 'gql-caching',           label: 'Caching Strategies',        description: 'HTTP caching, persisted queries, response caching, CDN at the edge' },
  ],
  advanced: [
    { id: 'gql-federation-adv',    label: 'Advanced Federation',       description: 'Federation v2, progressive overrides, contract schemas, demand control' },
    { id: 'gql-codegen',           label: 'Code Generation',           description: 'graphql-codegen, typed resolvers, typed hooks, schema-first workflow' },
    { id: 'gql-performance',       label: 'Performance Optimisation',  description: 'Query complexity, depth limiting, query cost analysis, APQ' },
    { id: 'gql-real-time',         label: 'Real-Time Architecture',    description: 'SSE vs WebSocket, graphql-ws, live queries, Redis PubSub at scale' },
    { id: 'gql-schema-stitching',  label: 'Schema Stitching',          description: 'Remote schemas, mergeSchemas, type merging, @merge directive' },
    { id: 'gql-security',          label: 'Security',                  description: 'Introspection disabling, depth/complexity limits, query allowlisting, CSRF' },
    { id: 'gql-observability',     label: 'Tracing & Observability',   description: 'Apollo Studio, OpenTelemetry, resolver-level tracing, error rates' },
    { id: 'gql-testing',           label: 'Testing GraphQL APIs',      description: 'Unit testing resolvers, integration testing with mocked schema, MSW' },
  ],
  expert: [
    { id: 'gql-language-spec',     label: 'GraphQL Language Spec',     description: 'AST nodes, parse/validate/execute phases, TypeInfo visitor' },
    { id: 'gql-custom-scalars',    label: 'Custom Scalars',            description: 'Scalar serialise/parseValue/parseLiteral, DateTime, JSON, Upload' },
    { id: 'gql-execution-engine',  label: 'Execution Engine',          description: 'graphql-js execution, field execution, promise resolution, defer/stream' },
    { id: 'gql-defer-stream',      label: '@defer & @stream',          description: 'Incremental delivery, multipart HTTP, partial rendering with Suspense' },
    { id: 'gql-client-architecture',label: 'Client Architecture',      description: 'Apollo Client cache normalisation, reactive variables, cache policies' },
    { id: 'gql-contract-testing',  label: 'Contract Testing',          description: 'Schema registry, breaking change detection, schema checks, rover CLI' },
    { id: 'gql-serverless',        label: 'GraphQL on Serverless',     description: 'Cold starts with schema parsing, Lambda resolvers, edge GraphQL' },
    { id: 'gql-distributed',       label: 'Distributed GraphQL',       description: 'Query planning across subgraphs, entity resolution, query deduplication' },
  ],
};

export type SupportedSkill = 'react' | 'nodejs' | 'mongodb' | 'typescript' | 'python' | 'postgresql' | 'docker' | 'graphql';

// UX-15: single source of truth for the supported-skill list. session.service.ts
// imports this rather than re-declaring it, so adding a new skill doesn't
// require touching two files.
export const SUPPORTED_SKILLS: SupportedSkill[] = ['react', 'nodejs', 'mongodb', 'typescript', 'python', 'postgresql', 'docker', 'graphql'];

export const CONCEPT_REGISTRY: Record<SupportedSkill, ConceptLibrary> = {
  react:      REACT_CONCEPTS,
  nodejs:     NODEJS_CONCEPTS,
  mongodb:    MONGODB_CONCEPTS,
  typescript: TYPESCRIPT_CONCEPTS,
  python:     PYTHON_CONCEPTS,
  postgresql: POSTGRESQL_CONCEPTS,
  docker:     DOCKER_CONCEPTS,
  graphql:    GRAPHQL_CONCEPTS,
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

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript
// ─────────────────────────────────────────────────────────────────────────────
