import winston from 'winston';
import path from 'path';
import fs from 'fs';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;
const isProd = process.env.NODE_ENV === 'production';

const SENSITIVE = new Set(['password','passwordhash','token','accesstoken','refreshtoken','authorization','cookie','jwt','secret','apikey']);

function redact(obj: unknown, depth = 0): unknown {
  if (depth > 6 || !obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(v => redact(v, depth+1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    out[k] = SENSITIVE.has(k.toLowerCase()) ? '[REDACTED]' : redact(v, depth+1);
  }
  return out;
}

const devFormat = combine(
  colorize({ all: true }), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const extra = Object.keys(meta).length ? ' ' + JSON.stringify(redact(meta)) : '';
    return stack ? `[${ts}] ${level}: ${message}${extra}\n${stack}` : `[${ts}] ${level}: ${message}${extra}`;
  }),
);
const prodFormat = combine(timestamp(), errors({ stack: true }), winston.format(info => redact(info) as typeof info)(), json());

if (isProd) { try { fs.mkdirSync('logs', { recursive: true }); } catch {} }

const transports: winston.transport[] = [
  new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' }),
];
if (isProd) {
  transports.push(
    new winston.transports.File({ filename: path.join('logs','error.log'), level:'error', maxsize:50*1024*1024, maxFiles:5 }),
    new winston.transports.File({ filename: path.join('logs','combined.log'), maxsize:100*1024*1024, maxFiles:10 }),
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  format: isProd ? prodFormat : devFormat,
  transports, exitOnError: false,
});

export function logError(err: Error, ctx?: { userId?: string; endpoint?: string; statusCode?: number }) {
  logger.error(err.message, { ...ctx, stack: err.stack });
}
export function logAntiCheat(ctx: { eventType: string; sessionId: string; userId: string; strikeCount: number }) {
  logger.warn('[anti-cheat]', ctx);
}
export function logCertificate(ctx: { action: string; userId: string; skillName: string; tier: string; score: number }) {
  logger.info('[certificate]', ctx);
}
export function logAuth(ctx: { action: string; userId?: string; ip?: string; reason?: string }) {
  logger.info('[auth]', ctx);
}
export default logger;
