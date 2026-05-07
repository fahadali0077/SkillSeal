import jwt from 'jsonwebtoken';
import type { ITokenPayload } from '@SkillSeal/shared';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_dev';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_dev';
const EMAIL_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_dev'; // same key, different expiry

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
