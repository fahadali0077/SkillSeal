import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Loader2, CheckCircle2, XCircle, ShieldCheck, Briefcase, Mail, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { registerSchema, type RegisterFormValues } from './authSchemas';
import { useAuthStore } from './useAuth';
import { ApiRequestError, authApi } from './authApi';
import { useSEO } from '../../lib/useSEO';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';

interface PasswordRule { label: string; test: (v: string) => boolean; }
const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One number',           test: (v) => /[0-9]/.test(v) },
  { label: 'One special character',test: (v) => /[^A-Za-z0-9]/.test(v) },
];

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
            {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

// ── Email verification pending screen ─────────────────────────────────────────

function EmailVerificationPending({ email, firstName }: { email: string; firstName: string }) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [params] = useSearchParams();
  const redirectParam = params.get('redirect') ?? '';

  const handleResend = async () => {
    if (resending || resent) return;
    setResending(true);
    try {
      await authApi.resendVerification(email);
      setResent(true);
      toast.success('Verification email sent again!');
      setTimeout(() => setResent(false), 5000);
    } catch {
      toast.error("Couldn't resend right now. Please try again in a minute.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      marketingTitle={<>Almost there!<br /><span className="text-seal-300">One quick step left.</span></>}
      marketingBody="We've sent you a verification email. Open it, click the link, and your SkillSeal account is ready to use."
    >
      <div className="card p-6 sm:p-8 text-center">
        {/* Animated envelope icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="flex justify-center mb-6"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded border border-paper-line bg-paper-sunk flex items-center justify-center">
              <Mail size={36} className="text-brand" />
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
              className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-sm ring-1 ring-paper-card"
            >
              <CheckCircle2 size={14} className="text-white" />
            </motion.div>
          </div>
        </motion.div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
          Check your inbox, {firstName}!
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          We've sent a verification link to{' '}
          <span className="font-semibold text-gray-800 break-all">{email}</span>.
          <br />
          Click the link in that email to activate your account.
        </p>

        {/* Steps */}
        <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-6 border border-gray-100">
          {[
            { step: '1', text: 'Open your email inbox' },
            { step: '2', text: 'Find the email from SkillSeal' },
            { step: '3', text: 'Click "Verify my email" in the email' },
            { step: '4', text: 'Sign in and start verifying your skills' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0">{step}</span>
              <span className="text-sm text-gray-600">{text}</span>
            </div>
          ))}
        </div>

        <Link
          to={redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : "/login"}
          className="btn-primary w-full py-3 mb-4"
        >
          Go to Sign In <ArrowRight size={15} />
        </Link>

        <p className="text-xs text-gray-400 mb-2">Didn't receive the email? Check your spam folder or</p>
        <button
          onClick={handleResend}
          disabled={resending || resent}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {resending ? (
            <><Loader2 size={13} className="animate-spin" />Sending…</>
          ) : resent ? (
            <><CheckCircle2 size={13} className="text-green-500" />Email sent!</>
          ) : (
            <><RefreshCw size={13} />Resend verification email</>
          )}
        </button>
      </div>
    </AuthShell>
  );
}

// ── Registration form ─────────────────────────────────────────────────────────

export default function RegisterPage() {
  useSEO({ title: 'Create Your Account', description: 'Join SkillSeal to get your skills verified or find verified talent.', canonical: '/register' });
  const [params] = useSearchParams();
  const initialRole = params.get('role') === 'recruiter' ? 'recruiter' : 'candidate';

  const register_  = useAuthStore((s) => s.register);
  const isLoading  = useAuthStore((s) => s.isLoading);

  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [role,        setRole]        = useState<'candidate' | 'recruiter'>(initialRole);

  // After successful registration, store email + name to show on pending screen
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingName,  setPendingName]  = useState<string>('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });
  const passwordValue = watch('password', '');

  const onSubmit = async (data: RegisterFormValues) => {
    setServerError(null);
    const toastId = toast.loading('Creating your account…');
    try {
      await register_({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role,
      });
      // No need to log out — register() no longer authenticates the session.
      // The user must verify their email and then sign in.
      toast.success('Account created! Please verify your email.', { id: toastId });
      setPendingName(data.firstName);
      setPendingEmail(data.email);
    } catch (err) {
      const msg = err instanceof ApiRequestError
        ? err.message
        : 'An unexpected error occurred. Please try again.';
      toast.error(msg, { id: toastId });
      setServerError(msg);
    }
  };

  // ── Show email verification pending screen ───────────────────────────────────
  if (pendingEmail) {
    return <EmailVerificationPending email={pendingEmail} firstName={pendingName} />;
  }

  // ── Registration form ────────────────────────────────────────────────────────
  return (
    <AuthShell>
      <div className="card p-6 sm:p-8">
        {/* Role selector */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3 text-center">I am joining as a…</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('candidate')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${role === 'candidate' ? 'border-brand bg-blue-50 ring-2 ring-brand/10' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${role === 'candidate' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500'}`}>
                <ShieldCheck size={18} />
              </div>
              <div className="text-center">
                <p className={`text-sm font-semibold ${role === 'candidate' ? 'text-brand' : 'text-gray-700'}`}>Candidate</p>
                <p className="text-[11px] text-gray-400">Verify my skills</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRole('recruiter')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${role === 'recruiter' ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/10' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${role === 'recruiter' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                <Briefcase size={18} />
              </div>
              <div className="text-center">
                <p className={`text-sm font-semibold ${role === 'recruiter' ? 'text-indigo-700' : 'text-gray-700'}`}>Recruiter</p>
                <p className="text-[11px] text-gray-400">Hire verified talent</p>
              </div>
            </button>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-1 tracking-tight">
          {role === 'recruiter' ? 'Create your recruiter account' : 'Create your account'}
        </h2>
        <p className="text-sm text-gray-500 mb-5">It only takes a minute</p>

        <AnimatePresence>
          {serverError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2"
            >
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {serverError}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit(onSubmit as any)} noValidate className="space-y-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
              <input id="firstName" type="text" autoComplete="given-name" className={`input ${errors.firstName ? 'border-red-400' : ''}`} placeholder="Ada" {...register('firstName')} />
              {errors.firstName && <p className="mt-1.5 text-xs text-red-600">{errors.firstName.message}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
              <input id="lastName" type="text" autoComplete="family-name" className={`input ${errors.lastName ? 'border-red-400' : ''}`} placeholder="Lovelace" {...register('lastName')} />
              {errors.lastName && <p className="mt-1.5 text-xs text-red-600">{errors.lastName.message}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
            <input id="email" type="email" autoComplete="email" className={`input ${errors.email ? 'border-red-400' : ''}`} placeholder="you@example.com" {...register('email')} />
            {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input id="password" type={showPass ? 'text' : 'password'} autoComplete="new-password" className={`input pr-10 ${errors.password ? 'border-red-400' : ''}`} placeholder="••••••••" {...register('password')} />
              <button type="button" onClick={() => setShowPass(p => !p)} className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors" tabIndex={-1}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>}
            <PasswordStrength password={passwordValue} />
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
            <div className="relative">
              <input id="confirmPassword" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" className={`input pr-10 ${errors.confirmPassword ? 'border-red-400' : ''}`} placeholder="••••••••" {...register('confirmPassword')} />
              <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors" tabIndex={-1}>
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full inline-flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-xl transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white text-base ${role === 'recruiter' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30' : 'bg-brand hover:bg-brand-dark shadow-lg shadow-brand/20 hover:shadow-brand/30'}`}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {isLoading ? 'Creating account…' : role === 'recruiter' ? 'Create Recruiter Account' : 'Create Account'}
          </button>

          <p className="text-xs text-gray-400 leading-relaxed text-center">
            By creating an account you agree to SkillSeal's{' '}
            <a href="/terms" className="text-gray-500 hover:text-brand transition-colors">Terms of Service</a>{' '}and{' '}
            <a href="/privacy" className="text-gray-500 hover:text-brand transition-colors">Privacy Policy</a>.
          </p>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="text-brand hover:text-brand-dark font-semibold">Sign in</Link>
      </p>
    </AuthShell>
  );
}
