# SkillSeal Test Suite

## Backend Tests (Jest + Supertest + MongoDB Memory Server)

```bash
cd server
npm test                  # run all tests
npm run test:coverage     # with coverage report
npm run test:ci           # CI mode (forceExit, runInBand)
```

### Test file
| File | What it tests |
|---|---|
| `auth.test.ts` | Register (201/409/400), login (200/401/403), refresh, logout, brute-force 429 |
| `assessment.test.ts` | Session start, answer submit, timer expiry mock, anti-cheat strikes, adaptive difficulty, question mutation |
| `scoring.test.ts` | Composite formula (85.5 check), certificate threshold, retakeAfterDays, computeCompositeScore service, verifyCertificateHash |
| `certificate.test.ts` | Public GET /verify/:id, PII exclusion, 404/EXPIRED/FLAGGED variants, hash tamper detection |
| `recruiter.test.ts` | 401/403 access control, verifiedOnly filter, full candidate view, pipeline upsert |
| `connections.test.ts` | Send→accept lifecycle, 409 duplicate, decline, weekly limit, block visibility |

### Infrastructure
- **MongoDB**: `mongodb-memory-server` (in-process, no Docker needed)
- **Redis**: `ioredis-mock` via `moduleNameMapper` in `jest.config.ts`
- **OpenAI**: `jest.mock('../ai/questionGenerator', ...)` — returns deterministic fixtures
- **Email**: `jest.mock('../services/email.service', ...)` — no-op

## Frontend Tests (Vitest + React Testing Library + MSW)

```bash
cd client
npm test                  # run all tests
npm run test:coverage     # with coverage
npm run test:watch        # watch mode
```

### Test files
| File | What it tests |
|---|---|
| `IsolationMode.test.tsx` | TimerBar color thresholds (blue/amber/red), MM:SS format, MCQ auto-submit on click, paste preventDefault, spellCheck=false, registerAutoSubmit |
| `SessionComplete.test.tsx` | Loading spinner, score ≥ 70 cert card + copy button, score 50–69 retake 7d, score <50 retake 14d, AI flag notice, error fallback, onReset callback |

### Infrastructure
- **API mocks**: MSW (`msw/node`) — handlers per test, reset between tests
- **Socket**: `vi.mock('../../lib/socketClient', ...)` — no-op
- **Browser APIs**: stubbed in `setupTests.ts` (clipboard, IntersectionObserver, ResizeObserver, matchMedia)
- **Framer Motion**: pass-through mock to avoid JSDOM animation issues
