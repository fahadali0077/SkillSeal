// ─────────────────────────────────────────────────────────────────────────────
// auth.routes.ts
// All authentication endpoints under /api/v1/auth
// ─────────────────────────────────────────────────────────────────────────────

import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { ApiErrorCode } from '@SkillSeal/shared';
import {
  register,
  login,
  refreshTokens,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  REFRESH_COOKIE_KEY,
} from '../services/auth.service';
import { authenticate, type AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AppError } from '../middleware/error.middleware';

const router = Router();

// ── Validation middleware factory ─────────────────────────────────────────────

function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const fieldErrors = errors.array().map((e) => ({
      field: (e as { path?: string }).path ?? 'unknown',
      message: e.msg as string,
    }));
    sendValidationError(res, fieldErrors);
    return;
  }
  next();
}

// ── Cookie helper ─────────────────────────────────────────────────────────────

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_KEY, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/api/v1/auth',           // scope cookie to auth routes only
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_KEY, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/v1/auth',
  });
}

// ── Shared error mapper ───────────────────────────────────────────────────────

function handleAuthError(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    // Map known messages to typed error codes
    let code: ApiErrorCode = ApiErrorCode.INTERNAL_ERROR;
    const msg = err.message.toLowerCase();

    if (msg.includes('already exists')) code = ApiErrorCode.EMAIL_IN_USE;
    else if (msg.includes('invalid email or password')) code = ApiErrorCode.INVALID_CREDENTIALS;
    else if (msg.includes('verify your email')) code = ApiErrorCode.EMAIL_NOT_VERIFIED;
    else if (msg.includes('too many')) code = ApiErrorCode.RATE_LIMIT_EXCEEDED;
    else if (msg.includes('password must')) code = ApiErrorCode.INVALID_FIELD_VALUE;
    else if (msg.includes('invalid or expired refresh')) code = ApiErrorCode.REFRESH_TOKEN_INVALID;
    else if (msg.includes('verification link')) code = ApiErrorCode.INVALID_TOKEN;
    else if (msg.includes('reset link')) code = ApiErrorCode.INVALID_TOKEN;
    else if (msg.includes('invalidated')) code = ApiErrorCode.TOKEN_VERSION_MISMATCH;
    else if (msg.includes('not found')) code = ApiErrorCode.USER_NOT_FOUND;
    else if (msg.includes('already been used')) code = ApiErrorCode.INVALID_TOKEN;

    sendError(res, err.message, err.statusCode, code);
  } else {
    sendError(res, 'An unexpected error occurred.', 500, ApiErrorCode.INTERNAL_ERROR);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/register
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('firstName').trim().notEmpty().withMessage('First name required'),
    body('lastName').trim().notEmpty().withMessage('Last name required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await register(req.body as {
        email: string; password: string;
        firstName: string; lastName: string;
        role?: 'candidate' | 'recruiter';
      });

      // Deliberately no refresh cookie and no access token — the user must
      // verify their email and log in before they can access the app.
      sendSuccess(
        res,
        { user: result.user },
        'Registration successful. Please check your email to verify your account before logging in.',
        201,
      );
    } catch (err) {
      handleAuthError(err, res);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/login
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const result = await login({ email, password });

      setRefreshCookie(res, result.refreshToken);
      sendSuccess(res, {
        user: result.user,
        token: result.accessToken,
      }, 'Login successful');
    } catch (err) {
      handleAuthError(err, res);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/refresh
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/refresh',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const oldToken = (req.cookies as Record<string, string>)[REFRESH_COOKIE_KEY];
      if (!oldToken) {
        sendError(res, 'No refresh token provided.', 401, ApiErrorCode.REFRESH_TOKEN_INVALID);
        return;
      }

      const { accessToken, refreshToken } = await refreshTokens(oldToken);

      setRefreshCookie(res, refreshToken);
      sendSuccess(res, { token: accessToken }, 'Token refreshed');
    } catch (err) {
      clearRefreshCookie(res);
      handleAuthError(err, res);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/logout
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/logout',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (req.user) await logout(req.user.userId);
      clearRefreshCookie(res);
      sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
      handleAuthError(err, res);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/verify-email
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/verify-email',
  [body('token').notEmpty().withMessage('Verification token required')],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await verifyEmail((req.body as { token: string }).token);
      sendSuccess(res, null, 'Email verified successfully. You can now log in.');
    } catch (err) {
      handleAuthError(err, res);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/resend-verification
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/resend-verification',
  [body('email').isEmail().normalizeEmail().withMessage('Valid email required')],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    // Always 200 — never reveal whether the email exists or is already verified.
    await resendVerification((req.body as { email: string }).email).catch(() => {/* swallow */});
    sendSuccess(
      res,
      null,
      'If an unverified account with that email exists, a new verification link has been sent.',
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('Valid email required')],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    // Always return 200 — never reveal whether email exists
    await forgotPassword((req.body as { email: string }).email).catch(() => {/* swallow */ });
    sendSuccess(
      res,
      null,
      'If an account with that email exists, a reset link has been sent.',
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, newPassword } = req.body as { token: string; newPassword: string };
      await resetPassword(token, newPassword);
      sendSuccess(res, null, 'Password reset successfully. Please log in with your new password.');
    } catch (err) {
      handleAuthError(err, res);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/_debug/email   ⚠️  TEMPORARY DIAGNOSTIC — REMOVE BEFORE LAUNCH
// Synchronously sends a test email and returns the exact SMTP result/error
// in the HTTP response. Lets us debug Brevo without reading server logs.
// ─────────────────────────────────────────────────────────────────────────────

import { sendVerificationEmail } from '../services/email.service';

router.post(
  '/_debug/email',
  [body('to').isEmail().normalizeEmail().withMessage('Valid recipient email required')],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    const { to } = req.body as { to: string };
    const env = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER_set: !!process.env.SMTP_USER,
      SMTP_PASS_set: !!process.env.SMTP_PASS,
      FROM_EMAIL: process.env.FROM_EMAIL,
      NODE_ENV: process.env.NODE_ENV,
    };
    try {
      await sendVerificationEmail({ to, firstName: 'Debug', token: 'debug-token-' + Date.now() });
      res.status(200).json({ success: true, message: 'Email send completed without throwing.', env });
    } catch (err) {
      const e = err as { code?: string; response?: string; responseCode?: number; command?: string; message?: string; stack?: string };
      res.status(500).json({
        success: false,
        message: 'Email send threw an error.',
        env,
        error: {
          message: e.message,
          code: e.code,
          responseCode: e.responseCode,
          response: e.response,
          command: e.command,
        },
      });
    }
  },
);

export default router;
