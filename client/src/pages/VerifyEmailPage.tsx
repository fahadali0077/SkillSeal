// ─────────────────────────────────────────────────────────────────────────────
// VerifyEmailPage.tsx
// Handles /verify-email?token=<jwt> links sent by email.
// Calls the backend, then redirects to /login on success or shows an error.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../features/auth/authApi';

type Status = 'loading' | 'success' | 'error' | 'missing';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const called = useRef(false); // prevent double-call in React StrictMode

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setStatus('missing');
      return;
    }

    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('success');
        // Give the user a moment to see the success message, then go to login
        setTimeout(() => navigate('/login', { replace: true }), 2500);
      })
      .catch((err: Error) => {
        setStatus('error');
        setErrorMsg(err.message || 'Verification failed. The link may have expired.');
      });
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-blue-700 rounded-xl flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955
                   11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824
                   10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>

        {status === 'loading' && (
          <>
            <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-800">Verifying your email…</h1>
            <p className="text-gray-500 mt-2 text-sm">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-800">Email verified!</h1>
            <p className="text-gray-500 mt-2 text-sm">
              Your account is now active. Redirecting you to sign in…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-800">Verification failed</h1>
            <p className="text-gray-500 mt-2 text-sm">{errorMsg}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-6 w-full bg-blue-700 text-white py-2.5 rounded-lg font-medium hover:bg-blue-800 transition"
            >
              Go to Sign In
            </button>
          </>
        )}

        {status === 'missing' && (
          <>
            <h1 className="text-xl font-semibold text-gray-800">Invalid link</h1>
            <p className="text-gray-500 mt-2 text-sm">
              No verification token found. Please use the link from your email.
            </p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-6 w-full bg-blue-700 text-white py-2.5 rounded-lg font-medium hover:bg-blue-800 transition"
            >
              Go to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  );
}
