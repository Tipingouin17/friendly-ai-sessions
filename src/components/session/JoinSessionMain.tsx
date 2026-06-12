/**
 * Join Session Main
 *
 * Participant pre-join waiting room. All displayed values come from the loaded
 * conversation/session, live participant rows, or the participant's current
 * local name/avatar/media choices. No mock participant rows are rendered.
 */

import React, { useState, useEffect, useRef } from 'react';
import BoringAvatar from 'boring-avatars';
import { AlertCircle, Users, Zap, Globe, WifiOff, ArrowRight } from "lucide-react";
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
    return <p className="text-sm text-slate-500">You may be the first participant to join.</p>;
  }

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
        {hiddenCount > 0 ? `+${hiddenCount} more in the waiting room` : `${totalCount} currently in the waiting room`}
      </p>
    </div>
  );
};

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

  // ── Loading-timeout state: show error after 20 s of skeleton ────────────
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isLoading && !conversation) {
      loadingTimerRef.current = setTimeout(() => setLoadingTimedOut(true), 20_000);
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
              <p className="text-gray-500 text-sm mb-6">The server is taking too long to respond. Please check your connection and try again.</p>
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
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f1e9ff_0,#f8f5ff_28%,transparent_45%),radial-gradient(circle_at_bottom_right,#fff3d6_0,transparent_38%)] flex items-start justify-center px-4 pt-8 pb-6 sm:items-center">
        <div className="w-full max-w-5xl">
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center gap-2">
              <div className="p-2 bg-indigo-600 rounded-xl">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">AIfacilitator</span>
            </div>
          </div>
          <div className="grid overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-2xl shadow-slate-200/70 lg:grid-cols-2">
            <div className="border-b border-slate-200 p-8 lg:border-b-0 lg:border-r">
              <div className="h-5 w-28 animate-pulse rounded bg-slate-100" />
              <div className="mt-5 aspect-video animate-pulse rounded-2xl bg-slate-100" />
            </div>
            <div className="p-8">
              <div className="h-8 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-slate-100" />
              <div className="mt-8 h-28 animate-pulse rounded-2xl bg-slate-100" />
              <div className="mt-8 h-12 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const participantCountLabel = effectiveMaxParticipants > 0
    ? `${currentParticipantCount} / ${effectiveMaxParticipants} joined`
    : `${currentParticipantCount} joined`;
  const totalForAvatarStack = Math.max(currentParticipantCount, joinedParticipants.length);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f1e9ff_0,#f8f5ff_28%,transparent_45%),radial-gradient(circle_at_bottom_right,#fff3d6_0,transparent_38%)] flex items-start justify-center px-4 pt-8 pb-6 sm:items-center">
      <div className="w-full max-w-5xl">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center gap-6">
          <div className="inline-flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">AIfacilitator</span>
          </div>

          {facilitatorDetails && (
            <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-200/70">
              {facilitatorDetails.profile_picture ? (
                <img
                  src={facilitatorDetails.profile_picture}
                  alt={facilitatorDetails.title || "Facilitator"}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                  {(facilitatorDetails.title || "F")[0]}
                </div>
              )}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Your facilitator</p>
                <p className="text-sm font-bold text-slate-900">{facilitatorDetails.title || "AI Facilitator"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Main card */}
        <div className="grid overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-2xl shadow-slate-200/70 backdrop-blur lg:grid-cols-2">
          <div className="border-b border-slate-200 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Your preview</p>
            <PreJoinMediaCheck
              conversationId={conversation?.id ?? null}
              disabled={isJoining || !isTokenReady}
              participantName={participantName}
              avatarSeed={avatarSeed}
              onAvatarChange={onAvatarChange}
            />
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-7">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{sessionTitle}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {participantCountLabel}
                </span>
                {languageLabel && (
                  <span className="inline-flex items-center gap-1.5">
                    <Globe className="h-4 w-4" />
                    {languageLabel}
                  </span>
                )}
              </div>
            </div>

            {sessionObjective && (
              <div className="mb-7 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Session objective</p>
                <p className="text-sm leading-6 text-slate-700">{sessionObjective}</p>
              </div>
            )}

            <div className="mb-7">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Currently in waiting room</p>
              <ParticipantAvatarStack participants={joinedParticipants} totalCount={totalForAvatarStack} />
            </div>

            {error && (
              <div className="p-3.5 mb-5 border border-red-100 bg-red-50 rounded-xl text-red-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Unable to join session</p>
                    <p className="text-xs text-red-500 mt-0.5">{error}</p>
                    <Button
                      onClick={onRetry}
                      className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 text-xs py-1 px-2 h-auto"
                      variant="ghost"
                      size="sm"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {isPreparingSession && (
              <div className="mb-5 flex items-center gap-3 p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                <div className="shrink-0">
                  <svg className="w-5 h-5 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-800">Preparing your session…</p>
                  <p className="text-xs text-indigo-500 mt-0.5">The AI facilitator is getting ready</p>
                </div>
              </div>
            )}

            {isFull ? (
              <SessionFullAlert type="full" />
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Your name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={participantName}
                    onChange={onNameChange}
                    className="h-12 rounded-2xl border-slate-200 bg-white px-4 text-base font-medium shadow-sm"
                    autoComplete="name"
                  />
                </div>

                <Button
                  onClick={handleJoinClick}
                  className="h-14 w-full rounded-2xl bg-indigo-600 text-base font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700"
                  disabled={isJoining || !isTokenReady || isFull || !participantName.trim()}
                >
                  {isJoining ? (
                    <span className="flex items-center justify-center">
                      <span className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin mr-2"></span>
                      Joining...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      Join Session <ArrowRight className="ml-2 h-4 w-4" />
                    </span>
                  )}
                </Button>
                <p className="text-center text-xs text-slate-400">Your audio and video settings are saved for this session.</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-7">
          Powered by AIfacilitator · AI-driven workshop facilitation
        </p>
      </div>
    </div>
  );
};

export default JoinSessionMain;
