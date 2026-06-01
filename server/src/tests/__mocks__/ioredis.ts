// ─────────────────────────────────────────────────────────────────────────────
// __mocks__/ioredis.ts
// In-memory Redis mock used during tests.
// Jest resolves this automatically via moduleNameMapper or manual mock.
// ─────────────────────────────────────────────────────────────────────────────

import RedisMock from 'ioredis-mock';

// Singleton mock instance — shared across all imports in a test run
const redisMock = new RedisMock();

// Match the ioredis export shape
const Redis = jest.fn().mockImplementation(() => redisMock);

export default Redis;
export { Redis };
