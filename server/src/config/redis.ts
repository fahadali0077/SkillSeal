import Redis from 'ioredis';
import logger from '../utils/logger';

let redisClient: Redis | null = null;

export async function connectRedis(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL env var is not set. Add it in Render → Environment tab.');

  const client = new Redis(url, {
    maxRetriesPerRequest: 1,          // fail fast during bootstrap
    retryStrategy: () => null,        // no retries during initial connect
    lazyConnect: true,
    connectTimeout: 8000,
  });

  client.on('connect', () => logger.info('✅ Redis connected'));
  client.on('error', (err) => logger.error('Redis error:', err));
  client.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  await client.connect();             // throws if unreachable — caught in bootstrap
  client.setMaxListeners(50);
  // switch to persistent retry strategy once connected
  client.options.retryStrategy = (times) => Math.min(times * 100, 3000);
  redisClient = client;
}

/** Returns true only when Redis connected successfully. */
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
    logger.info('Redis connection closed');
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}
