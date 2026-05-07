// ─────────────────────────────────────────────────────────────────────────────
// authSchemas.ts
// Zod validation schemas for all auth forms.
// These match the server-side validation exactly.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

const PASSWORD_REGEX  = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_MSG    =
  'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.';

// ── Reusable field schemas ────────────────────────────────────────────────────

const emailField    = z.string().email('Please enter a valid email address').toLowerCase();
const passwordField = z.string().regex(PASSWORD_REGEX, PASSWORD_MSG);

// ── Login ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email:    emailField,
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// ── Register ──────────────────────────────────────────────────────────────────

export const registerSchema = z
  .object({
    firstName:       z.string().min(1, 'First name is required').max(50),
    lastName:        z.string().min(1, 'Last name is required').max(50),
    email:           emailField,
    password:        passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path:    ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

// ── Forgot password ───────────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// ── Reset password ────────────────────────────────────────────────────────────

export const resetPasswordSchema = z
  .object({
    newPassword:     passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path:    ['confirmPassword'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
