/**
 * Join Session Main
 *
 * Participant pre-join waiting room. All displayed values come from the loaded
 * conversation/session, live participant rows, or the participant's current
 * local name/avatar/media choices. No mock participant rows are rendered.
 *
 * UX redesign: single-column, step-by-step flow so any first-time user
 * immediately understands what to do.
 */

import React, { useState, useEffect, useRef } from 'react';
import BoringAvatar from 'boring-avatars';
import { AlertCircle, Users, Zap, Globe, WifiOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SessionFullAlert from "./SessionFullAlert";
import PreJoinMediaCheck from './PreJoinMediaCheck';
import { ConversationWithSession } from "@/types/database";
import { ParticipantInfo } from "@/types/chat";

interface JoinSessionMainProps {
  conversation: ConversationWithSession | null;
  error?: string;
  isFull: boolean;
  participantName: string;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  avatarSeed: string;
  onAvatarChange: () => void;
  onJoinSession?: () => Promise<any>;
  isJoining: boolean;
  /** True while the initial conversation data is still loading — shows a skeleton */
  isLoading?: boolean;
  /** True while the AI facilitator is generating the welcome message after join */
  isPreparingSession?: boolean;
  currentParticipantCount: number;
  effectiveMaxParticipants: number;
  joinedParticipants?: ParticipantInfo[];
  onRetry: () => void;
  isTokenReady?: boolean;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', fr: 'French', de: 'German', es: 'Spanish',
  it: 'Italian', pt: 'Portuguese', nl: 'Dutch', pl: 'Polish',
  ru: 'Russian', zh: 'Chinese', ja: 'Japanese', ar: 'Arabic',
};

const AVATAR_COLORS = ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'];

const ParticipantAvatarStack: React.FC<{ participants: ParticipantInfo[]; totalCount: number }> = ({ participants, totalCount }) => {
  const visibleParticipants = participants.slice(0, 3);
  const hiddenCount = Math.max(0, totalCount - visibleParticipants.length);

  if (totalCount <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Be the first to join
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex -space-x-2">
        {visibleParticipants.map((participant) => (
          <div key={participant.id} className="h-7 w-7 overflow-hidden rounded-full border-2 border-white bg-white shadow-sm" title={participant.name}>
            {participant.avatar ? (
              <img src={participant.avatar} alt={participant.name} className="h-full w-full object-cover" />
            ) : (
              <BoringAvatar
                size={28}
                name={participant.avatarSeed || participant.name}
                variant="beam"
                colors={AVATAR_COLORS}
                square={false}
              />
            )}
          </div>
        ))}
      </div>
      <span className="text-xs text-slate-500">
        {hiddenCount > 0
          ? `${totalCount} in the waiting room (+${hiddenCount} more)`
          : `${totalCount} already in the waiting room`}
      </span>
    </div>
  );
};

/** Numbered step badge */
const StepBadge: React.FC<{ n: number; done?: boolean }> = ({ n, done }) => (
  <span
    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
      done
        ? 'bg-emerald-500 text-white'
        : 'bg-indigo-600 text-white'
    }`}
  >
    {done ? <CheckCircle2 className="h-4 w-4" /> : n}
  </span>
);

const JoinSessionMain: React.FC<JoinSessionMainProps> = ({
  conversation,
  error,
  isFull,
  participantName,
  onNameChange,
  avatarSeed,
  onAvatarChange,
  onJoinSession,
  isJoining,
  isLoading = false,
  isPreparingSession = false,
  currentParticipantCount,
  effectiveMaxParticipants,
  joinedParticipants = [],
  onRetry,
  isTokenReady = true
}) => {
  const facilitatorDetails = conversation?.sessions?.facilitator_details;
  const sessionTitle = conversation?.sessions?.title || "Workshop Session";
  const sessionObjective = conversation?.sessions?.objective || null;
  const language: string | null = conversation?.language ?? null;
  const languageLabel = language ? (LANGUAGE_NAMES[language.toLowerCase()] ?? language) : null;

  const handleJoinClick = async () => {
    if (onJoinSession) await onJoinSession();
  };

  // ── Loading-timeout state: show a bounded recovery state after 12 s ─────
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isLoading && !conversation) {
      loadingTimerRef.current = setTimeout(() => setLoadingTimedOut(true), 12_000);
    } else {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      setLoadingTimedOut(false);
    }
    return () => { if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current); };
  }, [isLoading, conversation]);

  // ── Skeleton while conversation data loads ────────────────────────────
  if (isLoading && !conversation) {
    if (loadingTimedOut) {
      return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f1e9ff_0,#f8f5ff_28%,transparent_45%),radial-gradient(circle_at_bottom_right,#fff3d6_0,transparent_38%)] flex items-start justify-center px-4 pt-8 pb-6 sm:items-center">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-600 rounded-xl">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">AIfacilitator</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-yellow-50 rounded-full">
                  <WifiOff className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
              <p className="text-gray-900 font-semibold text-lg mb-1">Unable to reach the session</p>
              <p className="text-gray-500 text-sm mb-6">The session is taking longer than expected to load. Check your connection, then try again.</p>
              <div className="space-y-2.5">
                <button
                  onClick={onRetry}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => { window.location.href = '/'; }}
                  className="w-full border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium py-2.5 px-4 rounded-xl transition-colors"
                >
                  Return Home
                </button>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-4">
              Powered by AIfacilitator · AI-driven workshop facilitation
            </p>
          </div>
        </div>
      );
    }
    // Loading skeleton — single-column layout
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f1e9ff_0,#f8f5ff_28%,transparent_45%),radial-gradient(circle_at_bottom_right,#fff3d6_0,transparent_38%)] flex items-start justify-center px-4 pt-8 pb-6 sm:items-center">
        <div className="w-full max-w-lg">
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-2">
              <div className="p-2 bg-indigo-600 rounded-xl">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">AIfacilitator</span>
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-2xl shadow-slate-200/70 p-8 space-y-5">
            <div className="h-7 w-2/3 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  // The DB counts the host row, so subtract 1 from both current and max
  // before showing attendee-facing numbers.
  const displayCurrentCount = Math.max(currentParticipantCount - 1, 0);
  const displayMaxCount = effectiveMaxParticipants > 0 ? Math.max(effectiveMaxParticipants - 1, 0) : 0;
  const participantCountLabel = displayMaxCount > 0
    ? `${displayCurrentCount} / ${displayMaxCount} joined`
    : `${displayCurrentCount} joined`;
  const totalForAvatarStack = Math.max(displayCurrentCount, joinedParticipants.length);

  const nameIsReady = participantName.trim().length > 0;
  const canJoin = !isJoining && isTokenReady && !isFull && nameIsReady;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f1e9ff_0,#f8f5ff_28%,transparent_45%),radial-gradient(circle_at_bottom_right,#fff3d6_0,transparent_38%)] flex items-start justify-center px-4 pt-8 pb-10 sm:items-center">
      <div className="w-full max-w-lg">

        {/* ── Brand header ── */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">AIfacilitator</span>
          </div>
        </div>

        {/* ── Main card ── */}
        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 shadow-2xl shadow-slate-200/70 backdrop-blur">

          {/* Session hero */}
          <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50/60 to-white px-6 py-6 sm:px-8 sm:py-7">
            {/* Facilitator pill */}
            {facilitatorDetails && (
              <div className="mb-4 inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                {facilitatorDetails.profile_picture ? (
                  <img
                    src={facilitatorDetails.profile_picture}
                    alt={facilitatorDetails.title || "Facilitator"}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                    {(facilitatorDetails.title || "F")[0]}
                  </div>
                )}
                <span className="text-xs font-semibold text-slate-600">{facilitatorDetails.title || "AI Facilitator"}</span>
              </div>
            )}

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl leading-snug">
              {sessionTitle}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                <Users className="h-4 w-4" />
                {participantCountLabel}
              </span>
              {languageLabel && (
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                  <Globe className="h-4 w-4" />
                  {languageLabel}
                </span>
              )}
            </div>

            {sessionObjective && (
              <p className="mt-4 text-sm leading-relaxed text-slate-600 border-l-2 border-indigo-300 pl-3">
                {sessionObjective}
              </p>
            )}

            {/* Who's already in */}
            <div className="mt-4">
              <ParticipantAvatarStack participants={joinedParticipants} totalCount={totalForAvatarStack} />
            </div>
          </div>

          {/* Steps */}
          <div className="px-6 py-6 sm:px-8 sm:py-7 space-y-6">

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-800">Unable to join session</p>
                  <p className="text-xs text-red-600 mt-0.5 break-words">{error}</p>
                  <button
                    onClick={onRetry}
                    className="mt-2 text-xs font-semibold text-red-700 underline underline-offset-2 hover:text-red-900"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {/* Preparing banner */}
            {isPreparingSession && (
              <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <svg className="w-5 h-5 text-indigo-600 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-indigo-800">Preparing your session…</p>
                  <p className="text-xs text-indigo-500 mt-0.5">The AI facilitator is getting ready</p>
                </div>
              </div>
            )}

            {isFull ? (
              <SessionFullAlert type="full" />
            ) : (
              <>
                {/* ── Step 1: Your name ── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <StepBadge n={1} done={nameIsReady} />
                    <div>
                      <p className="text-sm font-bold text-slate-900">What's your name?</p>
                      <p className="text-xs text-slate-400">This is how other participants will see you</p>
                    </div>
                  </div>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name…"
                    value={participantName}
                    onChange={onNameChange}
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-base font-medium shadow-sm focus:bg-white focus:border-indigo-400 focus:ring-indigo-200"
                    autoComplete="name"
                    autoFocus
                  />
                </div>

                {/* ── Step 2: Camera & mic ── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <StepBadge n={2} />
                    <div>
                      <p className="text-sm font-bold text-slate-900">Set up your camera & microphone</p>
                      <p className="text-xs text-slate-400">You can change these at any time during the session</p>
                    </div>
                  </div>
                  <PreJoinMediaCheck
                    conversationId={conversation?.id ?? null}
                    disabled={isJoining || !isTokenReady}
                    participantName={participantName}
                    avatarSeed={avatarSeed}
                    onAvatarChange={onAvatarChange}
                  />
                </div>

                {/* ── Join button ── */}
                <div className="pt-2 space-y-3">
                  <Button
                    onClick={handleJoinClick}
                    className="h-14 w-full rounded-2xl bg-indigo-600 text-base font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    disabled={!canJoin}
                  >
                    {isJoining ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Joining…
                      </span>
                    ) : !nameIsReady ? (
                      <span className="flex items-center justify-center gap-2 opacity-70">
                        Enter your name to continue
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Join Session
                        <ArrowRight className="h-5 w-5" />
                      </span>
                    )}
                  </Button>
                  <p className="text-center text-xs text-slate-400">
                    Your audio and video settings are saved for this session.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by AIfacilitator · AI-driven workshop facilitation
        </p>
      </div>
    </div>
  );
};

export default JoinSessionMain;
