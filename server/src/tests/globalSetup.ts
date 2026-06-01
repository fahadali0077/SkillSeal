// ─────────────────────────────────────────────────────────────────────────────
// globalSetup.ts  –  Jest globalSetup (runs before any test file)
// Sets required environment variables so env.ts Zod validation passes in tests.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = async function globalSetup() {
  process.env.NODE_ENV             = 'test';
  process.env.PORT                 = '0';
  process.env.MONGODB_URI          = 'mongodb://localhost:27017/SkillSeal_test';
  process.env.REDIS_URL            = 'redis://localhost:6379';
  process.env.JWT_ACCESS_SECRET    = 'test-access-secret-32-chars-minimum!!';
  process.env.JWT_REFRESH_SECRET   = 'test-refresh-secret-32-chars-minimum!';
  process.env.GEMINI_API_KEY       = 'test-gemini-api-key-mock-placeholder';
  process.env.CLOUDINARY_URL       = 'cloudinary://key:secret@cloud';
  process.env.CLIENT_URL           = 'http://localhost:5173';
  process.env.LOG_LEVEL            = 'error'; // silence logs during tests
  // Stripe is optional — not set for tests (billing routes are disabled)
};
