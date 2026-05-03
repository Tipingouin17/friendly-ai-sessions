/**
 * Participant Loading Shell
 *
 * Single unified loading/waiting UI for all participant-side transition states.
 * Replaces the three separate screens that used to flash in sequence:
 *   1. LoadingState            – generic spinner (no branding)
 *   2. ParticipantWaitingScreen – "Waiting for session to begin"
 *   3. SessionStartingGate      – "AI is preparing your welcome message"
 *
 * All three are now rendered through this one shell so the participant
 * experiences a single, consistent branded card that simply updates its
 * message as the session progresses — no full-page swaps.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Zap, Users, Clock, MessageSquare, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';

export type ParticipantLoadingPhase =
  | 'connecting'       // Initial load / token validation
  | 'waiting_host'     // Session not yet started — waiting for host
  | 'ai_generating'    // Session started — AI generating welcome message
  | 'message_ready'    // Welcome message ready — transitioning to chat
  | 'error'            // Something went wrong
  | 'timeout';         // AI taking too long

interface ParticipantLoadingShellProps {
  phase: ParticipantLoadingPhase;
  /** Name of the facilitator / session title */
  facilitatorTitle?: string;
  currentParticipantCount?: number;
  maxParticipants?: number;
  /** Error message (phase === 'error') */
  errorMessage?: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Number of retry attempts already made */
  retryCount?: number;
  /** Called when the user clicks "Try Again" on timeout */
  onRetryGeneration?: () => void;
}

const PHASE_CONFIG: Record<
  ParticipantLoadingPhase,
  { icon: React.ReactNode; title: string; subtitle: string }
> = {
  connecting: {
    icon: (
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600">
        <svg className="w-7 h-7 text-white animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    ),
    title: 'Connecting to session…',
    subtitle: 'Please wait a moment',
  },
  waiting_host: {
    icon: (
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100">
        <Clock className="w-7 h-7 text-indigo-600" />
      </div>
    ),
    title: 'Waiting for the session to begin',
    subtitle: 'The host will start the session shortly. Please stay on this page.',
  },
  ai_generating: {
    icon: (
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600">
        <svg className="w-7 h-7 text-white animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    ),
    title: 'The AI facilitator is getting ready…',
    subtitle: 'Preparing your personalised welcome message',
  },
  message_ready: {
    icon: (
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-100">
        <MessageSquare className="w-7 h-7 text-green-600" />
      </div>
    ),
    title: 'Welcome message ready',
    subtitle: 'Loading your session…',
  },
  error: {
    icon: (
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100">
        <AlertCircle className="w-7 h-7 text-red-500" />
      </div>
    ),
    title: 'Unable to connect',
    subtitle: 'Please check your connection and try again.',
  },
  timeout: {
    icon: (
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-yellow-100">
        <WifiOff className="w-7 h-7 text-yellow-500" />
      </div>
    ),
    title: 'Taking longer than expected',
    subtitle: 'The AI is still working on your welcome message.',
  },
};

const ParticipantLoadingShell: React.FC<ParticipantLoadingShellProps> = ({
  phase,
  facilitatorTitle,
  currentParticipantCount,
  maxParticipants,
  errorMessage,
  onRetry,
  retryCount = 0,
  onRetryGeneration,
}) => {
  const config = PHASE_CONFIG[phase];
  const [isRetrying, setIsRetrying] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleRetryGeneration = async () => {
    if (!onRetryGeneration || isRetrying) return;
    setIsRetrying(true);
    await onRetryGeneration();
    if (mountedRef.current) setIsRetrying(false);
  };

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
          {facilitatorTitle && (
            <p className="text-sm text-gray-500 mt-1">{facilitatorTitle}</p>
          )}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center space-y-4">

          {/* Phase icon */}
          <div className="flex justify-center">{config.icon}</div>

          {/* Title + subtitle */}
          <div>
            <p className="text-gray-900 font-semibold text-lg">{config.title}</p>
            <p className="text-gray-400 text-sm mt-1">
              {phase === 'error' && errorMessage ? errorMessage : config.subtitle}
            </p>
          </div>

          {/* Participant counter — shown when relevant */}
          {(phase === 'waiting_host' || phase === 'ai_generating') &&
            typeof currentParticipantCount === 'number' &&
            typeof maxParticipants === 'number' && (
              <div className="inline-flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2 border border-gray-100 text-sm text-gray-600">
                <Users className="h-4 w-4 text-gray-400" />
                <span>{currentParticipantCount} / {maxParticipants} participants joined</span>
              </div>
            )}

          {/* Retry / home buttons */}
          {(phase === 'error' || phase === 'timeout') && (
            <div className="space-y-2.5 pt-2">
              {(phase === 'timeout' ? onRetryGeneration : onRetry) && (
                <button
                  onClick={phase === 'timeout' ? handleRetryGeneration : onRetry}
                  disabled={isRetrying}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Retrying…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </>
                  )}
                </button>
              )}
              {(retryCount > 1 || phase === 'error') && (
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

export default ParticipantLoadingShell;
