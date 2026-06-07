/**
 * VerifyEmail
 *
 * Handles the /verify-email?token=... link from the confirmation email.
 * Calls the backend to validate the token, then logs the user in automatically.
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import PageHead from '@/components/PageHead';
import { EDGE_FUNCTION_URL } from '@/lib/api';
import { recordActivationEventBeacon } from '@/lib/activationTracking';
import { trackActivationEmailVerified } from '@/lib/tracking';

type Status = 'loading' | 'success' | 'error';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token found in the link. Please use the link from your email.');
      return;
    }

    const verify = async () => {
      try {
        // Call the backend verify-email endpoint
        const res = await fetch(`${EDGE_FUNCTION_URL}/auth/v1/verify-email?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (data?.access_token) {
          // Store the JWT so the app picks it up on next navigation
          localStorage.setItem('mf_session', JSON.stringify(data));
          recordActivationEventBeacon('activation_signup_completed', {
            activation_step: 'email_verified',
            source: 'verification_link',
          });
          trackActivationEmailVerified('verification_link');
          setStatus('success');
          // Redirect to the activation demo after a short delay.
          setTimeout(() => navigate('/onboarding/demo', { replace: true }), 2500);
        } else {
          setStatus('error');
          setErrorMessage(data?.message ?? 'Verification failed. Please try again.');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Verification failed. Please try again.';
        setStatus('error');
        setErrorMessage(msg);
      }
    };

    verify();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
      <PageHead title="Verify Email" description="Activating your AIfacilitator account." />
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-12 w-12 text-indigo-500 animate-spin mb-6" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verifying your email…</h1>
            <p className="text-gray-500 text-sm">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-9 w-9 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Email verified!</h1>
            <p className="text-gray-600 mb-6">
              Your account is now active. Redirecting you to your first AI workshop demo…
            </p>
            <Link
              to="/onboarding/demo"
              className="inline-block w-full py-3 px-6 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:opacity-90 transition"
            >
              Start AI demo workshop
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-9 w-9 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Verification failed</h1>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <Link
              to="/signup"
              className="inline-block w-full py-3 px-6 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:opacity-90 transition"
            >
              Sign up again
            </Link>
            <p className="mt-4 text-xs text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-500 hover:underline">
                Log in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
