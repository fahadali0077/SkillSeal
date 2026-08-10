import { useSEO } from '../../lib/useSEO';
// ─────────────────────────────────────────────────────────────────────────────
// ForgotPasswordPage.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Mail, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from './authSchemas';
import { useForgotPasswordMutation } from './authApi';
import AuthShell from './AuthShell';

export default function ForgotPasswordPage() {
  useSEO({ title: 'Reset Password', canonical: '/forgot-password' });
  const [submitted, setSubmitted] = useState(false);
  const mutation = useForgotPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    await mutation.mutateAsync(data.email);
    setSubmitted(true); // always show success — server never reveals if email exists
  };

  if (submitted) {
    return (
      <AuthShell
        marketingTitle={<>Reset sent.<br /><span className="text-seal-300">Check your inbox.</span></>}
        marketingBody="If an account exists with that email, you'll get a reset link within a minute. The link expires in 1 hour."
      >
        <div className="card p-6 sm:p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded border border-paper-line bg-paper-sunk flex items-center justify-center">
            <CheckCircle2 size={36} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Check your email</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            If an account exists for that email address, we've sent a password reset link.
            It will expire in 1 hour.
          </p>
          <Link to="/login" className="btn-primary w-full py-3">
            <ArrowLeft size={15} /> Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      marketingTitle={<>Forgot it?<br /><span className="text-seal-300">No problem.</span></>}
      marketingBody="Enter the email you signed up with. We'll send a secure reset link if an account exists."
    >
      <div className="card p-6 sm:p-8">
        <Link to="/login" className="btn-ghost text-sm -ml-2 mb-3">
          <ArrowLeft size={14} /> Back
        </Link>

        <h2 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">Reset your password</h2>
        <p className="text-sm text-gray-500 mb-6">
          We'll send you a reset link if an account exists.
        </p>

        <form onSubmit={handleSubmit(onSubmit as any)} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={`input ${errors.email ? 'border-red-400 focus:ring-red-400/20' : ''}`}
              placeholder="you@example.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
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
              <Mail size={16} />
            )}
            {mutation.isPending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Remembered it?{' '}
          <Link to="/login" className="text-brand hover:text-brand-dark font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
