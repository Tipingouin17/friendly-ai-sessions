
import React from 'react';
import { AlertCircle, Clock, Link2Off, WifiOff } from "lucide-react";

interface JoinSessionErrorStateProps {
  error?: string;
  invalidRequest: boolean;
  onRetry: () => void;
}

const JoinSessionErrorState: React.FC<JoinSessionErrorStateProps> = ({
  error,
  invalidRequest,
  onRetry,
}) => {
  const errorText = error?.toLowerCase() || '';

  // Determine error type for specific messaging
  const isSessionEnded = errorText.includes('session has ended') ||
    errorText.includes('no longer available') ||
    errorText.includes('session is closed') ||
    errorText.includes('completed');

  const isSessionFull = errorText.includes('full') || errorText.includes('capacity');

  const isNetworkError = errorText.includes('network') || errorText.includes('fetch') ||
    errorText.includes('connection') || errorText.includes('timeout');

  // ─── Session Ended ────────────────────────────────────────────────────────
  if (isSessionEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md text-center">
          <div className="mb-5 flex justify-center">
            <div className="p-4 bg-indigo-50 rounded-full">
              <Clock className="h-10 w-10 text-indigo-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session Has Ended</h2>
          <p className="text-gray-500 mb-7 text-sm leading-relaxed">
            This facilitated session has been completed. Thank you for your participation!
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // ─── Session Full ─────────────────────────────────────────────────────────
  if (isSessionFull) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md text-center">
          <div className="mb-5 flex justify-center">
            <div className="p-4 bg-orange-50 rounded-full">
              <AlertCircle className="h-10 w-10 text-orange-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session is Full</h2>
          <p className="text-gray-500 mb-7 text-sm leading-relaxed">
            This session has reached its maximum number of participants. Please contact the session host for assistance.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // ─── Invalid Link ─────────────────────────────────────────────────────────
  if (invalidRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md text-center">
          <div className="mb-5 flex justify-center">
            <div className="p-4 bg-red-50 rounded-full">
              <Link2Off className="h-10 w-10 text-red-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Session Link</h2>
          <p className="text-gray-500 mb-7 text-sm leading-relaxed">
            The session link you used appears to be invalid or has expired. Please check the link and try again, or ask the session host to resend the invite.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // ─── Network / Generic Error ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md text-center">
        <div className="mb-5 flex justify-center">
          <div className={`p-4 rounded-full ${isNetworkError ? 'bg-yellow-50' : 'bg-red-50'}`}>
            {isNetworkError
              ? <WifiOff className="h-10 w-10 text-yellow-500" />
              : <AlertCircle className="h-10 w-10 text-red-500" />
            }
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {isNetworkError ? 'Connection Problem' : 'Session Not Found'}
        </h2>
        <p className="text-gray-500 mb-2 text-sm leading-relaxed">
          {isNetworkError
            ? "We couldn't connect to the session. Please check your internet connection and try again."
            : "The session you're trying to join doesn't exist or has been closed by the host."
          }
        </p>
        {error && !isNetworkError && (
          <p className="text-xs text-red-400 bg-red-50 rounded-lg px-3 py-2 mb-5 text-left font-mono">
            {error}
          </p>
        )}
        <div className="mt-5 space-y-2.5">
          <button
            onClick={onRetry}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium py-2.5 px-4 rounded-xl transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinSessionErrorState;
