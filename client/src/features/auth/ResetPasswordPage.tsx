import { useSEO } from '../../lib/useSEO';
// ─────────────────────────────────────────────────────────────────────────────
// ResetPasswordPage.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { resetPasswordSchema, type ResetPasswordFormValues } from './authSchemas';
import { useResetPasswordMutation, ApiRequestError } from './authApi';
import AuthShell from './AuthShell';

export default function ResetPasswordPage() {
  useSEO({ title: 'Set New Password', canonical: '/reset-password' });
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const mutation = useResetPasswordMutation();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  if (!token) {
    return (
      <AuthShell
        marketingTitle={<>Hmm…<br /><span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">That link looks broken.</span></>}
        marketingBody="Reset links expire after 1 hour for your security. Request a new one and we'll get you back on track."
      >
        <div className="card p-6 sm:p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-red-100 to-red-50 rounded-2xl flex items-center justify-center">
            <AlertCircle size={36} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Invalid link</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            This password reset link is invalid or has expired.
          </p>
          <Link to="/forgot-password" className="btn-primary w-full py-3">
            Request a new link <ArrowRight size={15} />
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        marketingTitle={<>All set!<br /><span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">Password updated.</span></>}
        marketingBody="Your new password is now active. Sign in to get back to verifying your skills."
      >
        <div className="card p-6 sm:p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-green-100 to-green-50 rounded-2xl flex items-center justify-center">
            <CheckCircle2 size={36} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Password updated</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
          <Link to="/login" className="btn-primary w-full py-3">
            Sign in <ArrowRight size={15} />
          </Link>
        </div>
      </AuthShell>
    );
  }

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setServerError(null);
    try {
      await mutation.mutateAsync({ token, newPassword: data.newPassword });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setServerError(err.message);
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <AuthShell
      marketingTitle={<>Choose a strong<br /><span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">new password.</span></>}
      marketingBody="Use at least 8 characters, mix upper- and lowercase, add a number and a special character."
    >
      <div className="card p-6 sm:p-8">
        <div className="w-12 h-12 bg-gradient-to-br from-brand/15 to-brand/5 rounded-xl flex items-center justify-center mb-4">
          <KeyRound size={22} className="text-brand" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">Choose a new password</h2>
        <p className="text-sm text-gray-500 mb-6">Make it strong — at least 8 characters with mixed case, a number, and a symbol.</p>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit as any)} noValidate className="space-y-4">
          {/* New password */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
              New password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                className={`input pr-10 ${errors.newPassword ? 'border-red-400 focus:ring-red-400/20' : ''}`}
                placeholder="••••••••"
                {...register('newPassword')}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1.5 text-xs text-red-600">{errors.newPassword.message}</p>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirm new password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                className={`input pr-10 ${errors.confirmPassword ? 'border-red-400 focus:ring-red-400/20' : ''}`}
                placeholder="••••••••"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary w-full py-3"
          >
            {mutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <KeyRound size={16} />
            )}
            {mutation.isPending ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          <Link to="/login" className="text-brand hover:text-brand-dark font-semibold">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
