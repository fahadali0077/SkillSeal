// ─────────────────────────────────────────────────────────────────────────────
// auth.service.ts
// Complete authentication business logic for the SkillSeal platform.
// ─────────────────────────────────────────────────────────────────────────────

import bcrypt from 'bcryptjs';
import type { IUserPublic, IUserPrivate, IAuthResponse } from '@SkillSeal/shared';
import { ApiErrorCode } from '@SkillSeal/shared';
import { User } from '../models/User.model';
import type { IUserDocument } from '../models/User.model';
import { getRedis } from '../config/redis';
import {
  signTokenPair,
  signRefreshToken,
  signAccessToken,
  signEmailVerifyToken,
  signPasswordResetToken,
  verifyRefreshToken,
  verifyEmailVerifyToken,
  verifyPasswordResetToken,
} from '../utils/jwt';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from './email.service';
import { AppError } from '../middleware/error.middleware';
import logger from '../utils/logger';

// ── Constants ─────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const REFRESH_COOKIE_KEY = 'SkillSeal_refresh';
const BRUTE_FORCE_PREFIX = 'brute:';
const BRUTE_MAX_ATTEMPTS = 5;
const BRUTE_WINDOW_SECS = 15 * 60; // 15 minutes

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip sensitive fields and return the safe public shape */
function toPublicUser(doc: IUserDocument): IUserPublic {
  return {
    _id: doc._id.toString(),
    firstName: doc.firstName,
    lastName: doc.lastName,
    fullName: `${doc.firstName} ${doc.lastName}`,
    headline: doc.headline,
    summary: doc.summary,
    location: { city: doc.location?.city ?? '', country: doc.location?.country ?? '' },
    profilePhoto: doc.profilePhoto,
    bannerImage: doc.bannerImage,
    customUrl: doc.customUrl ?? '',
    role: doc.role,
    accountType: doc.accountType,
    openToWork: doc.openToWork,
    isHiring: doc.isHiring,
    skills: [],
    experience: [],
    education: [],
    links: [],
    connectionCount: doc.connections?.length ?? 0,
    followerCount: doc.followers?.length ?? 0,
    followingCount: doc.following?.length ?? 0,
    connectionStatus: 'none',
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function toPrivateUser(doc: IUserDocument): IUserPrivate {
  return {
    ...toPublicUser(doc),
    email: doc.email,
    emailVerified: doc.emailVerified,
    blockedUsers: doc.blockedUsers?.map((id) => id.toString()) ?? [],
    tokenVersion: doc.tokenVersion,
  };
}

/** Redis key for brute-force tracking */
function bruteKey(email: string): string {
  return `${BRUTE_FORCE_PREFIX}${email.toLowerCase()}`;
}

/** Validate password complexity */
function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&        // uppercase
    /[0-9]/.test(password) &&        // digit
    /[^A-Za-z0-9]/.test(password)   // special char
  );
}

// ── Register ──────────────────────────────────────────────────────────────────

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export async function register(input: RegisterInput): Promise<IAuthResponse> {
  const { email, password, firstName, lastName } = input;

  // 1. Validate password strength
  if (!isStrongPassword(password)) {
    throw new AppError(
      'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.',
      400,
      true,
    );
  }

  // 2. Check for duplicate email
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError('An account with this email already exists.', 409, true);
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // 4. Create user
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    role: 'candidate',
    accountType: 'free',
    emailVerified: false,
    tokenVersion: 0,
  });

  // 5. Generate tokens
  const tokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  };
  const { accessToken, refreshToken } = signTokenPair(tokenPayload);
  const verifyToken = signEmailVerifyToken(user._id.toString());

  // 6. Send verification email (non-blocking — don't fail registration if email fails)
  sendVerificationEmail({ to: user.email, firstName: user.firstName, token: verifyToken })
    .catch((err) => logger.error('[auth] Failed to send verification email:', err));

  logger.info(`[auth] Registered user: ${user.email}`);

  return {
    user: toPrivateUser(user),
    accessToken,
  };
}

// ── Login ─────────────────────────────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  user: IUserPublic;
  accessToken: string;
  refreshToken: string;
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const { email, password } = input;
  const redis = getRedis();
  const key = bruteKey(email);

  // 1. Brute-force check
  const attempts = await redis.get(key);
  if (attempts && parseInt(attempts, 10) >= BRUTE_MAX_ATTEMPTS) {
    const ttl = await redis.ttl(key);
    throw new AppError(
      `Too many failed attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`,
      429,
      true,
    );
  }

  // 2. Find user (select passwordHash which is normally excluded)
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    // Increment brute-force counter even for unknown email (prevents enumeration)
    await redis.set(key, (parseInt(attempts ?? '0', 10) + 1).toString(), 'EX', BRUTE_WINDOW_SECS);
    throw new AppError('Invalid email or password.', 401, true);
  }

  // 3. Compare password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const newCount = parseInt(attempts ?? '0', 10) + 1;
    await redis.set(key, newCount.toString(), 'EX', BRUTE_WINDOW_SECS);
    if (newCount >= BRUTE_MAX_ATTEMPTS) {
      logger.warn(`[auth] Brute-force lockout triggered for: ${email}`);
    }
    throw new AppError('Invalid email or password.', 401, true);
  }

  // 4. Check email verification
  if (!user.emailVerified) {
    throw new AppError('Please verify your email address before logging in.', 403, true);
  }

  // 5. Clear brute-force counter on success
  await redis.del(key);

  // 6. Issue tokens
  const tokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  logger.info(`[auth] Login: ${user.email}`);

  return { user: toPublicUser(user), accessToken, refreshToken };
}

// ── Refresh ───────────────────────────────────────────────────────────────────

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export async function refreshTokens(oldRefreshToken: string): Promise<RefreshResult> {
  // 1. Verify signature
  let payload;
  try {
    payload = verifyRefreshToken(oldRefreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token.', 401, true);
  }

  // 2. Load user and check tokenVersion (invalidation)
  const user = await User.findById(payload.userId);
  if (!user) {
    throw new AppError('User not found.', 401, true);
  }
  if (user.tokenVersion !== payload.tokenVersion) {
    throw new AppError('Session has been invalidated. Please log in again.', 401, true);
  }

  // 3. Issue rotated token pair
  const tokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  };

  return {
    accessToken: signAccessToken(tokenPayload),
    refreshToken: signRefreshToken(tokenPayload),
  };
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(userId: string): Promise<void> {
  // Increment tokenVersion — all existing refresh tokens become invalid
  await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
  logger.info(`[auth] Logout: userId=${userId}`);
}

// ── Verify email ──────────────────────────────────────────────────────────────

export async function verifyEmail(token: string): Promise<void> {
  let payload;
  try {
    payload = verifyEmailVerifyToken(token);
  } catch {
    throw new AppError('Invalid or expired verification link.', 400, true);
  }

  const user = await User.findById(payload.userId);
  if (!user) throw new AppError('User not found.', 404, true);
  if (user.emailVerified) return; // idempotent — already verified, no error

  user.emailVerified = true;
  await user.save();

  logger.info(`[auth] Email verified: ${user.email}`);
}

// ── Forgot password ───────────────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<void> {
  // Always resolve 200 — never reveal whether the email exists
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    logger.info(`[auth] Forgot password: email not found (${email}) — silently ignored`);
    return;
  }

  const resetToken = signPasswordResetToken(user._id.toString(), user.tokenVersion);

  sendPasswordResetEmail({ to: user.email, firstName: user.firstName, token: resetToken })
    .catch((err) => logger.error('[auth] Failed to send password reset email:', err));

  logger.info(`[auth] Password reset link sent: ${user.email}`);
}

// ── Reset password ────────────────────────────────────────────────────────────

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  // 1. Validate new password strength
  if (!isStrongPassword(newPassword)) {
    throw new AppError(
      'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.',
      400,
      true,
    );
  }

  // 2. Decode token
  let payload;
  try {
    payload = verifyPasswordResetToken(token);
  } catch {
    throw new AppError('Invalid or expired reset link.', 400, true);
  }

  // 3. Load user and check tokenVersion (single-use enforcement)
  const user = await User.findById(payload.userId);
  if (!user) throw new AppError('User not found.', 404, true);

  if (user.tokenVersion !== payload.tokenVersion) {
    throw new AppError('This reset link has already been used.', 400, true);
  }

  // 4. Hash and save, then invalidate all sessions
  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.tokenVersion += 1; // invalidates all existing tokens
  await user.save();

  logger.info(`[auth] Password reset completed: ${user.email}`);
}

// ── Re-export cookie name for use in route layer ──────────────────────────────
export { REFRESH_COOKIE_KEY };
