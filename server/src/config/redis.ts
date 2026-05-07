import Redis from 'ioredis';
import logger from '../utils/logger';

let redisClient: Redis | null = null;

export async function connectRedis(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL is not defined');

  // Upstash (and most managed Redis) requires TLS — the URL must start with rediss://
  // If redis:// is used instead, the server closes the connection immediately.
  if (url.startsWith('redis://') && url.includes('upstash.io')) {
    throw new Error(
      'REDIS_URL looks like an Upstash URL but is missing TLS.\n' +
      '  Change  redis://  →  rediss://  in your Render environment variables.'
    );
  }

  redisClient = new Redis(url, {
    maxRetriesPerRequest: 1,
    // Don't keep retrying at startup — fail fast with a clear error
    retryStrategy: (times) => (times < 2 ? 1000 : null),
    lazyConnect: true,
    // Explicitly enable TLS for rediss:// URLs (ioredis handles this automatically
    // but being explicit prevents issues on some hosting providers)
    ...(url.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
  });

  redisClient.on('connect',      () => logger.info('✅ Redis connected'));
  redisClient.on('error',        (err) => logger.error('Redis error:', err.message));
  redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  try {
    await redisClient.connect();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Give a clear actionable message for the most common mistake
    if (message.includes('Connection is closed') || message.includes('ECONNREFUSED')) {
      throw new Error(
        `Redis connection failed: "${message}"\n` +
        '  Most likely cause: REDIS_URL uses redis:// but the server requires TLS.\n' +
        '  Fix: Change redis:// → rediss:// in Render Environment Variables.'
      );
    }
    throw err;
  }
}

export function getRedis(): Redis {
  if (!redisClient) throw new Error('Redis not initialized. Call connectRedis() first.');
  return redisClient;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
}
