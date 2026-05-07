import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV:   z.enum(['development', 'production', 'test']).default('development'),
  PORT:       z.coerce.number().default(5000),

  // ── Database ──────────────────────────────────────────────────────────────
  MONGODB_URI: z.string().min(10),
  REDIS_URL:   z.string().default('redis://localhost:6379'),

  // ── Auth ──────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET:  z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  // ── AI (Gemini) ───────────────────────────────────────────────────────────
  GEMINI_API_KEY: z.string().min(10),

  // ── Media ─────────────────────────────────────────────────────────────────
  CLOUDINARY_URL: z.string().startsWith('cloudinary://'),

  // ── App ───────────────────────────────────────────────────────────────────
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  // ── Stripe (optional — billing disabled) ─────────────────────────────────
  STRIPE_SECRET_KEY:                z.string().optional().or(z.literal('')),
  STRIPE_WEBHOOK_SECRET:            z.string().optional().or(z.literal('')),
  STRIPE_PRO_MONTHLY_PRICE_ID:      z.string().optional().or(z.literal('')),
  STRIPE_PRO_YEARLY_PRICE_ID:       z.string().optional().or(z.literal('')),
  STRIPE_RECRUITER_MONTHLY_PRICE_ID:z.string().optional().or(z.literal('')),
  STRIPE_RECRUITER_YEARLY_PRICE_ID: z.string().optional().or(z.literal('')),
  STRIPE_ASSESSMENT_PRICE_ID:       z.string().optional().or(z.literal('')),

  // ── Email ─────────────────────────────────────────────────────────────────
  SMTP_HOST:  z.string().optional().or(z.literal('')),
  SMTP_PORT:  z.coerce.number().optional(),
  SMTP_USER:  z.string().optional().or(z.literal('')),
  SMTP_PASS:  z.string().optional().or(z.literal('')),
  FROM_EMAIL: z.string().optional().or(z.literal('')),

  // ── Observability ─────────────────────────────────────────────────────────
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  LOG_LEVEL:  z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;

function validateEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    // process.stdout.write is synchronous — guaranteed to flush before process.exit
    process.stdout.write('\n[env] ❌ Environment validation failed:\n');
    result.error.errors.forEach(e =>
      process.stdout.write(`[env]   • ${e.path.join('.')}: ${e.message}\n`)
    );
    process.stdout.write('[env] Fix the above variables in the Render dashboard → Environment tab\n\n');
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
