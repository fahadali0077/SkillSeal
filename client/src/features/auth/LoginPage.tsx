// ─────────────────────────────────────────────────────────────────────────────
// LoginPage.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck as ShieldIcon, Mail, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { loginSchema, type LoginFormValues } from './authSchemas';
import { useAuthStore, homeRouteForRole } from './useAuth';
import { ApiRequestError, authApi } from './authApi';
import { useSEO } from '../../lib/useSEO';
import toast from 'react-hot-toast';

// Server error codes we render with bespoke UI instead of the generic banner.
// Mirrors the values in shared/src/types/api.types.ts (ApiErrorCode).
const EMAIL_NOT_VERIFIED  = 'AUTH_005';
const INVALID_CREDENTIALS = 'AUTH_006';
const RATE_LIMIT          = 'RTL_001';

interface LoginErrorState {
  code: string;
  message: string;
  /** Email the user just tried to sign in with — used for the resend CTA. */
  email?: string;
}

// ── LoginErrorBanner ─────────────────────────────────────────────────────────
// Renders the right error UI based on the server's typed error code. The
// EMAIL_NOT_VERIFIED branch is the most important: it explains the problem
// AND offers a one-click resend so the user can recover without leaving the page.

function LoginErrorBanner({ error }: { error: LoginErrorState }) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (!error.email || resending || resent) return;
    setResending(true);
    try {
      await authApi.resendVerification(error.email);
      setResent(true);
      toast.success('Verification email sent. Please check your inbox.');
    } catch {
      toast.error("Couldn't resend right now. Please try again in a minute.");
    } finally {
      setResending(false);
    }
  };

  if (error.code === EMAIL_NOT_VERIFIED) {
    return (
      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Mail size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-900 text-sm">
              Please verify your email first
            </p>
            <p className="text-amber-800 text-sm mt-1 leading-relaxed">
              We sent a verification link to{' '}
              <span className="font-medium break-all">{error.email}</span>{' '}
              when you signed up. Click the link in that email to activate your
              account, then come back here to sign in.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resent}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-900 hover:text-amber-950 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {resending ? (
                  <><Loader2 size={13} className="animate-spin" /> Sending…</>
                ) : resent ? (
                  <><CheckCircle2 size={13} className="text-green-600" /> Sent — check your inbox</>
                ) : (
                  <><RefreshCw size={13} /> Resend verification email</>
                )}
              </button>
              <span className="text-xs text-amber-700">
                Don't see it? Check your spam folder.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error.code === RATE_LIMIT) {
    return (
      <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
        <AlertCircle size={16} className="text-orange-600 shrink-0 mt-0.5" />
        <p className="text-orange-800 text-sm">{error.message}</p>
      </div>
    );
  }

  // INVALID_CREDENTIALS and any other error fall through to a red banner.
  // For invalid credentials we use a slightly clearer message than the raw
  // server text (which is already good, but we soften the phrasing).
  const displayMessage = error.code === INVALID_CREDENTIALS
    ? "Email or password doesn't match. Double-check and try again."
    : error.message;

  return (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
      <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
      <p className="text-red-700 text-sm">{displayMessage}</p>
    </div>
  );
}

export default function LoginPage() {
  useSEO({ title: 'Log In', description: 'Log in to SkillSeal to verify your skills or access your recruiter dashboard.', canonical: '/login' });
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [showPass, setShowPass] = useState(false);
  const [loginError, setLoginError] = useState<LoginErrorState | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoginError(null);
    const toastId = toast.loading('Signing you in…');
    try {
      const { role } = await login(data.email, data.password);
      toast.success('Welcome back!', { id: toastId });
      navigate(homeRouteForRole(role), { replace: true });
    } catch (err) {
      // Pull the typed code out of ApiRequestError so we can branch the UI.
      const isApi = err instanceof ApiRequestError;
      const code = isApi ? err.code : 'UNKNOWN';
      const message = isApi ? err.message : 'An unexpected error occurred. Please try again.';

      // Email-not-verified gets bespoke inline UI (banner + resend) instead of
      // a toast — the user needs guidance, not a fleeting notification.
      if (code === EMAIL_NOT_VERIFIED) {
        toast.dismiss(toastId);
      } else {
        toast.error(message, { id: toastId });
      }
      setLoginError({ code, message, email: data.email });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 justify-center">
            <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center shadow-sm">
              <ShieldIcon size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">SkillSeal</h1>
          </Link>
          <p className="text-gray-500 mt-1 text-sm">Verified Skills for Proven Hiring</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in</h2>

          {/* Typed server error banner — branches on error code */}
          {loginError && <LoginErrorBanner error={loginError} />}

          <form onSubmit={handleSubmit(onSubmit as any)} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`input ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
                placeholder="you@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`input pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                  placeholder="••••••••"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Forgot password link */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-brand hover:text-brand-dark font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand hover:text-brand-dark font-medium">
              Join SkillSeal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
