import jwt from 'jsonwebtoken';
import type { ITokenPayload } from '@SkillSeal/shared';
// AUDIT §2.1 / §7.3: this file used to read process.env directly with the
// fallbacks 'access_secret_dev' / 'refresh_secret_dev'. Any entry point that
// imported it without first importing config/env — a script, a cron job, or
// socket/socket.ts, which imports verifyAccessToken from here directly — would
// silently sign AND verify tokens with a secret that is public in the source.
// Importing the validated config makes the guarantee structural rather than
// import-order-dependent: env.ts hard-fails startup if the secrets are missing.
import { env } from '../config/env';

const ACCESS_SECRET = env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;
const EMAIL_SECRET = env.JWT_ACCESS_SECRET; // same key, different expiry

// ── Access / Refresh ──────────────────────────────────────────────────────────

export function signAccessToken(payload: Omit<ITokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(payload: Omit<ITokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): ITokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as ITokenPayload;
}

export function verifyRefreshToken(token: string): ITokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as ITokenPayload;
}

export function signTokenPair(payload: Omit<ITokenPayload, 'iat' | 'exp'>) {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

// ── Email verification token (24h) ────────────────────────────────────────────

export interface IEmailVerifyPayload {
  userId: string;
  purpose: 'email_verify';
}

export function signEmailVerifyToken(userId: string): string {
  const payload: IEmailVerifyPayload = { userId, purpose: 'email_verify' };
  return jwt.sign(payload, EMAIL_SECRET, { expiresIn: '24h' });
}

export function verifyEmailVerifyToken(token: string): IEmailVerifyPayload {
  const decoded = jwt.verify(token, EMAIL_SECRET) as IEmailVerifyPayload;
  if (decoded.purpose !== 'email_verify') throw new Error('Invalid token purpose');
  return decoded;
}

// ── Password reset token (1h, single-use via tokenVersion) ───────────────────

export interface IPasswordResetPayload {
  userId: string;
  tokenVersion: number; // must match user.tokenVersion at time of use
  purpose: 'password_reset';
}

export function signPasswordResetToken(userId: string, tokenVersion: number): string {
  const payload: IPasswordResetPayload = { userId, tokenVersion, purpose: 'password_reset' };
  return jwt.sign(payload, EMAIL_SECRET, { expiresIn: '1h' });
}

export function verifyPasswordResetToken(token: string): IPasswordResetPayload {
  const decoded = jwt.verify(token, EMAIL_SECRET) as IPasswordResetPayload;
  if (decoded.purpose !== 'password_reset') throw new Error('Invalid token purpose');
  return decoded;
}
