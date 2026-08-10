import 'dotenv/config';
import https from 'https';

// ── Catch anything that slips past the bootstrap try/catch ──────────────────
process.on('uncaughtException', (err) => {
  process.stdout.write(`\n[FATAL] uncaughtException: ${err.stack ?? err.message}\n`);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  process.stdout.write(`\n[FATAL] unhandledRejection: ${String(reason)}\n`);
  process.exit(1);
});

import app from './app';
import { connectDB } from './config/database';
import { connectRedis } from './config/redis';
import { createServer } from 'http';
import { initSocket } from './config/socket';
import logger from './utils/logger';

const PORT = process.env.PORT || 5000;

// ── Keep-alive ping (prevents Render free tier 15-min sleep) ─────────────────
const KEEP_ALIVE_URL = process.env.SELF_PING_URL || process.env.RENDER_EXTERNAL_URL;
if (process.env.NODE_ENV === 'production' && KEEP_ALIVE_URL) {
  setInterval(() => {
    https
      .get(`${KEEP_ALIVE_URL}/api/health`, (res) => {
        process.stdout.write(`[ping] Self-ping status: ${res.statusCode}\n`);
      })
      .on('error', (e) => {
        process.stdout.write(`[ping] Self-ping failed: ${e.message}\n`);
      });
  }, 7 * 60 * 1000); // every 7 min — safely under the 15-min idle threshold
  process.stdout.write(`[boot] Keep-alive ping enabled → ${KEEP_ALIVE_URL}/api/health\n`);
}

process.stdout.write(`[boot] Starting SkillSeal API  NODE_ENV=${process.env.NODE_ENV}  PORT=${PORT}\n`);
process.stdout.write(`[boot] MONGODB_URI  = ${process.env.MONGODB_URI ? '✓ set' : '✗ MISSING'}\n`);
process.stdout.write(`[boot] REDIS_URL    = ${process.env.REDIS_URL ? '✓ set' : '✗ MISSING'}\n`);
process.stdout.write(`[boot] GROQ_API_KEY = ${process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY ? '✓ set' : '✗ MISSING'}\n`);
process.stdout.write(`[boot] CLOUDINARY_URL = ${process.env.CLOUDINARY_URL ? '✓ set' : '✗ MISSING'}\n`);
process.stdout.write(`[boot] JWT_ACCESS_SECRET  = ${process.env.JWT_ACCESS_SECRET ? `✓ (${process.env.JWT_ACCESS_SECRET.length} chars)` : '✗ MISSING'}\n`);
process.stdout.write(`[boot] JWT_REFRESH_SECRET = ${process.env.JWT_REFRESH_SECRET ? `✓ (${process.env.JWT_REFRESH_SECRET.length} chars)` : '✗ MISSING'}\n`);

async function bootstrap() {
  try {
    process.stdout.write('[boot] Connecting to MongoDB...\n');
    await connectDB();
    process.stdout.write('[boot] MongoDB OK\n');

    process.stdout.write('[boot] Connecting to Redis...\n');
    try {
      await connectRedis();
      process.stdout.write('[boot] Redis OK\n');
    } catch (redisErr: unknown) {
      const msg = redisErr instanceof Error ? redisErr.message : String(redisErr);
      process.stdout.write(`[boot] ⚠️  Redis unavailable: ${msg}\n`);
      process.stdout.write('[boot] Server will start without Redis — assessment/session routes will return 503 until Redis is reachable.\n');
      process.stdout.write('[boot] Fix: set REDIS_URL in the Render dashboard → Environment tab (use Upstash or Render Redis add-on).\n');
    }

    const httpServer = createServer(app);
    initSocket(httpServer);

    httpServer.listen(PORT, () => {
      process.stdout.write(`[boot] 🚀 Server listening on port ${PORT}\n`);
      logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.stack ?? err.message : String(err);
    process.stdout.write(`\n[FATAL] Bootstrap failed:\n${message}\n\n`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    process.exit(1);
  }
}

bootstrap();