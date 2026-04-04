/**
 * Join Session Loading State
 *
 * Session component for the AIfacilitator application.
 * Uses the same card shell as JoinSessionMain for visual consistency.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Zap, WifiOff, AlertCircle } from 'lucide-react';

interface JoinSessionLoadingStateProps {
  onRetry?: () => void;
  error?: string | null;
  retryCount?: number;
  loadingTimeElapsed?: number;
  customMessage?: string;
}

const JoinSessionLoadingState: React.FC<JoinSessionLoadingStateProps> = ({
  onRetry,
  error,
  retryCount = 0,
  loadingTimeElapsed = 0,
  customMessage
}) => {
  const [elapsed, setElapsed] = useState(loadingTimeElapsed);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const interval = setInterval(() => {
      if (mountedRef.current) setElapsed(e => e + 1);
    }, 1000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const isLongWait = elapsed > 8;
  const isVeryLongWait = elapsed > 15;

  const message = customMessage
    ?? (error ? 'Unable to connect to the session'
      : isVeryLongWait ? (retryCount > 1 ? 'Still having trouble connecting…' : 'Connection taking longer than expected')
      : elapsed > 2 ? 'Establishing connection…'
      : 'Loading session…');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-start sm:items-center justify-center px-4 pt-6 pb-4 sm:py-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">AIfacilitator</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            {error ? (
              <div className="p-3 bg-red-50 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            ) : isVeryLongWait ? (
              <div className="p-3 bg-yellow-50 rounded-full">
                <WifiOff className="h-8 w-8 text-yellow-500" />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600">
                <svg className="w-7 h-7 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>

          <p className="text-gray-900 font-semibold text-lg mb-1">{message}</p>
          <p className="text-gray-400 text-sm">
            {error ? 'Please check your connection and try again.'
              : isVeryLongWait ? 'The session might be unavailable or there could be connection issues.'
              : 'Please wait a moment'}
          </p>

          {/* Retry / home buttons — only shown after a long wait or on error */}
          {(isVeryLongWait || error) && onRetry && (
            <div className="mt-6 space-y-2.5">
              <button
                onClick={onRetry}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
              >
                Try Again
              </button>
              {(retryCount > 1 || error) && (
                <button
                  onClick={() => { window.location.href = '/'; }}
                  className="w-full border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium py-2.5 px-4 rounded-xl transition-colors"
                >
                  Return Home
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by AIfacilitator · AI-driven workshop facilitation
        </p>
      </div>
    </div>
  );
};

export default JoinSessionLoadingState;
