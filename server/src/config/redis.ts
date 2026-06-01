import Redis from 'ioredis';
import logger from '../utils/logger';

let redisClient: Redis | null = null;

export async function connectRedis(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL env var is not set. Add it in Render → Environment tab.');

  // Single stable config — no post-connect mutation of options
  const client = new Redis(url, {
    lazyConnect: true,
    connectTimeout: 8000,
    maxRetriesPerRequest: null,             // let commands wait for reconnect
    retryStrategy: (times) => {
      if (times > 3) return null;           // give up after 3 attempts at bootstrap
      return Math.min(times * 200, 2000);
    },
  });

  client.on('connect',      () => logger.info('✅ Redis connected'));
  client.on('error',        (err: Error) => logger.error('Redis error:', err.message));
  client.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  await client.connect();   // throws if unreachable — caught non-fatally in bootstrap
  redisClient = client;
}

/** True only when Redis is connected and ready to accept commands. */
export function isRedisReady(): boolean {
  return redisClient !== null && redisClient.status === 'ready';
}

export function getRedis(): Redis {
  if (!redisClient) throw new Error('Redis is not available. Configure REDIS_URL on Render.');
  return redisClient;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}
