/**
 * Participant Loading Shell
 *
 * Single unified loading/waiting UI for all participant-side transition states.
 * Replaces the three separate screens that used to flash in sequence:
 *   1. LoadingState            – generic spinner (no branding)
 *   2. ParticipantWaitingScreen – "Waiting for session to begin"
 *   3. SessionStartingGate      – "AI is preparing your welcome message"
 *
 * The component stays mounted and only changes phase/copy, so the participant
 * sees one consistent waiting-room surface instead of multiple transition pages.
 */
import React, { useEffect, useRef, useState } from 'react';
import BoringAvatar from 'boring-avatars';
import { Zap, Users, Clock, MessageSquare, WifiOff, AlertCircle, RefreshCw, Globe } from 'lucide-react';
import { ParticipantInfo } from '@/types/chat';

export type ParticipantLoadingPhase =
  | 'connecting'       // Initial load / token validation
  | 'waiting_host'     // Session not yet started — waiting for host
  | 'ai_generating'    // Session started — AI generating welcome message
  | 'message_ready'    // Welcome message ready — transitioning to chat
  | 'error'            // Something went wrong
  | 'timeout';         // AI taking too long

interface ParticipantLoadingShellProps {
  phase: ParticipantLoadingPhase;
  /** Name of the facilitator */
  facilitatorTitle?: string;
  facilitatorAvatar?: string | null;
  sessionTitle?: string;
  sessionObjective?: string | null;
  languageLabel?: string | null;
  participants?: ParticipantInfo[];
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
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
        <svg className="h-7 w-7 animate-spin text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    ),
    title: 'Connecting to session…',
    subtitle: 'Please wait a moment while we load the room.',
  },
  waiting_host: {
    icon: (
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
        <Clock className="h-7 w-7 text-indigo-600" />
      </div>
    ),
    title: 'You are in the waiting room',
    subtitle: 'The host will start the session shortly. Please stay on this page.',
  },
  ai_generating: {
    icon: (
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
        <svg className="h-7 w-7 animate-spin text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    ),
    title: 'The AI facilitator is getting ready…',
    subtitle: 'Preparing your personalised welcome message.',
  },
  message_ready: {
    icon: (
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100">
        <MessageSquare className="h-7 w-7 text-green-600" />
      </div>
    ),
    title: 'Welcome message ready',
    subtitle: 'Loading your session…',
  },
  error: {
    icon: (
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
        <AlertCircle className="h-7 w-7 text-red-500" />
      </div>
    ),
    title: 'Unable to connect',
    subtitle: 'Please check your connection and try again.',
  },
  timeout: {
    icon: (
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100">
        <WifiOff className="h-7 w-7 text-yellow-500" />
      </div>
    ),
    title: 'Taking longer than expected',
    subtitle: 'The AI is still working on your welcome message.',
  },
};

const AVATAR_COLORS = ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'];

const ParticipantAvatarStack: React.FC<{ participants: ParticipantInfo[]; totalCount?: number }> = ({ participants, totalCount }) => {
  const visibleParticipants = participants.filter((participant) => !participant.isHost).slice(0, 4);
  const count = Math.max(totalCount ?? 0, visibleParticipants.length);
  const hiddenCount = Math.max(0, count - visibleParticipants.length);

  if (count <= 0) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {visibleParticipants.map((participant) => (
          <div key={participant.id} className="h-9 w-9 overflow-hidden rounded-full border-2 border-white bg-white shadow-sm" title={participant.name}>
            {participant.avatar ? (
              <img src={participant.avatar} alt={participant.name} className="h-full w-full object-cover" />
            ) : (
              <BoringAvatar
                size={36}
                name={participant.avatarSeed || participant.name}
                variant="beam"
                colors={AVATAR_COLORS}
                square={false}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-500">
        {hiddenCount > 0 ? `+${hiddenCount} with you` : `${count} joined`}
      </p>
    </div>
  );
};

const ParticipantLoadingShell: React.FC<ParticipantLoadingShellProps> = ({
  phase,
  facilitatorTitle,
  facilitatorAvatar,
  sessionTitle,
  sessionObjective,
  languageLabel,
  participants = [],
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

  const shouldShowSessionDetails = Boolean(sessionTitle || sessionObjective || languageLabel || currentParticipantCount !== undefined || participants.length > 0);
  const participantCountLabel = typeof currentParticipantCount === 'number'
    ? (typeof maxParticipants === 'number' && maxParticipants > 0
      ? `${currentParticipantCount} / ${maxParticipants} joined`
      : `${currentParticipantCount} joined`)
    : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f1e9ff_0,#f8f5ff_28%,transparent_45%),radial-gradient(circle_at_bottom_right,#fff3d6_0,transparent_38%)] flex items-start justify-center px-4 pt-8 pb-6 sm:items-center">
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex flex-col items-center gap-5">
          <div className="inline-flex items-center gap-2">
            <div className="rounded-xl bg-indigo-600 p-2 shadow-lg shadow-indigo-500/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">AIfacilitator</span>
          </div>

          {facilitatorTitle && (
            <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-200/70">
              {facilitatorAvatar ? (
                <img src={facilitatorAvatar} alt={facilitatorTitle} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                  {facilitatorTitle[0]}
                </div>
              )}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Your facilitator</p>
                <p className="text-sm font-bold text-slate-900">{facilitatorTitle}</p>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-2xl shadow-slate-200/70 backdrop-blur">
          <div className="grid gap-0 md:grid-cols-[0.8fr_1.2fr]">
            <div className="flex flex-col items-center justify-center border-b border-slate-200 p-8 text-center md:border-b-0 md:border-r">
              <div className="mb-5 flex justify-center">{config.icon}</div>
              <p className="text-lg font-bold text-slate-950">{config.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {phase === 'error' && errorMessage ? errorMessage : config.subtitle}
              </p>
            </div>

            <div className="p-8">
              {shouldShowSessionDetails && (
                <div className="space-y-6">
                  {sessionTitle && <h1 className="text-2xl font-bold tracking-tight text-slate-950">{sessionTitle}</h1>}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    {participantCountLabel && (
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        {participantCountLabel}
                      </span>
                    )}
                    {languageLabel && (
                      <span className="inline-flex items-center gap-1.5">
                        <Globe className="h-4 w-4" />
                        {languageLabel}
                      </span>
                    )}
                  </div>

                  {sessionObjective && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Session objective</p>
                      <p className="text-sm leading-6 text-slate-700">{sessionObjective}</p>
                    </div>
                  )}

                  <div>
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Already joined</p>
                    <ParticipantAvatarStack participants={participants} totalCount={currentParticipantCount} />
                  </div>
                </div>
              )}

              {(phase === 'error' || phase === 'timeout') && (
                <div className="space-y-2.5 pt-6">
                  {(phase === 'timeout' ? onRetryGeneration : onRetry) && (
                    <button
                      onClick={phase === 'timeout' ? handleRetryGeneration : onRetry}
                      disabled={isRetrying}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {isRetrying ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Retrying…
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Try Again
                        </>
                      )}
                    </button>
                  )}
                  {(retryCount > 1 || phase === 'error') && (
                    <button
                      onClick={() => { window.location.href = '/'; }}
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 font-medium text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      Return Home
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="mt-7 text-center text-xs text-gray-400">
          Powered by AIfacilitator · AI-driven workshop facilitation
        </p>
      </div>
    </div>
  );
};

export default ParticipantLoadingShell;
