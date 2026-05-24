/**
 * VerifyEmailSent
 *
 * Shown immediately after a user registers. Instructs them to check their
 * inbox and click the verification link before they can log in.
 */

import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import PageHead from '@/components/PageHead';
import { api } from '@/lib/api';

const VerifyEmailSent: React.FC = () => {
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email ?? 'your email address';
  const canResend = email !== 'your email address';
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResendVerification = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setResendMessage(null);
    setResendError(null);
    const { error } = await api.auth.resendVerificationEmail(email);
    setResending(false);
    if (error) {
      setResendError(error.message || 'We could not resend the verification email. Please try again.');
      return;
    }
    setResendMessage('If this account is still awaiting verification, a new link has been sent.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
      <PageHead
        title="Verify your email"
        description="Check your inbox to activate your AIfacilitator account."
      />
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
          <Mail className="h-8 w-8 text-indigo-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">Check your inbox</h1>

        <p className="text-gray-600 mb-2">
          We've sent a verification link to
        </p>
        <p className="font-semibold text-indigo-700 mb-6 break-all">{email}</p>

        <p className="text-sm text-gray-500 mb-8">
          Click the link in the email to activate your account. The link expires in&nbsp;
          <strong>24&nbsp;hours</strong>.
        </p>

        <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-700 text-left mb-6 space-y-1">
          <p className="font-semibold mb-1">Didn't receive the email?</p>
          <ul className="list-disc list-inside space-y-1 text-indigo-600">
            <li>Check your spam or junk folder</li>
            <li>Make sure you entered the correct email address</li>
            <li>Wait a few minutes and refresh your inbox</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={handleResendVerification}
          disabled={!canResend || resending}
          className="mb-4 inline-block w-full py-3 px-6 rounded-full border border-indigo-200 text-indigo-700 font-semibold text-sm hover:bg-indigo-50 transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resending ? 'Sending...' : 'Resend verification email'}
        </button>

        {resendMessage && (
          <p className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
            {resendMessage}
          </p>
        )}

        {resendError && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
            {resendError}
          </p>
        )}

        <Link
          to="/login"
          className="inline-block w-full py-3 px-6 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:opacity-90 transition"
        >
          Go to Login
        </Link>

        <p className="mt-4 text-xs text-gray-400">
          Wrong email?{' '}
          <Link to="/signup" className="text-indigo-500 hover:underline">
            Sign up again
          </Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmailSent;
