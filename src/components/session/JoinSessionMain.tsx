/**
 * Join Session Main
 *
 * Session component for the AIfacilitator application.
 */

import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Users, Zap, Clock, BarChart2, Globe, Tag, WifiOff, Headphones, Mic, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import JoinForm from "./JoinForm";
import SessionFullAlert from "./SessionFullAlert";
import { ConversationWithSession } from "@/types/database";

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
  onRetry: () => void;
  isTokenReady?: boolean;
}

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
  onRetry,
  isTokenReady = true
}) => {
  const facilitatorDetails = conversation?.sessions?.facilitator_details;
  const sessionTitle = conversation?.sessions?.title || "Workshop Session";
  const durationMinutes: number | null = (conversation?.sessions as any)?.duration_minutes ?? null;
  const difficultyLevel: string | null = (conversation?.sessions as any)?.difficulty_level ?? null;
  const sessionType: string | null = (conversation?.sessions as any)?.session_type ?? null;
  const language: string | null = conversation?.language ?? null;

  const LANGUAGE_NAMES: Record<string, string> = {
    en: 'English', fr: 'French', de: 'German', es: 'Spanish',
    it: 'Italian', pt: 'Portuguese', nl: 'Dutch', pl: 'Polish',
    ru: 'Russian', zh: 'Chinese', ja: 'Japanese', ar: 'Arabic',
  };
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
      // Backend did not respond within 20 s — show a clear error with retry button
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-start sm:items-center justify-center px-4 pt-6 pb-4 sm:py-4">
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
              <p className="text-gray-900 font-semibold text-lg mb-1">Still connecting to the session</p>
              <p className="text-gray-500 text-sm mb-2 leading-relaxed">This can happen when the service is waking up or the network is unstable.</p>
              <p className="text-gray-400 text-xs mb-6 leading-relaxed">Please keep the page open and retry. If it still does not load, ask the host to share the session link again.</p>
              <div className="space-y-2.5">
                <button
                  onClick={onRetry}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
                >
                  Retry connection
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
              Powered by AIfacilitator · Voice-first AI workshop facilitation
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-start sm:items-center justify-center px-4 pt-6 pb-4 sm:py-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-600 rounded-xl">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">AIfacilitator</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Skeleton facilitator banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 animate-pulse" />
              <div className="space-y-1.5 flex-1">
                <div className="h-2.5 bg-white/30 rounded animate-pulse w-1/3" />
                <div className="h-3.5 bg-white/40 rounded animate-pulse w-1/2" />
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="h-6 bg-gray-100 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
              <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-11 bg-indigo-100 rounded-xl animate-pulse" />
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

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Facilitator banner */}
          {facilitatorDetails && (
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center gap-3">
              {facilitatorDetails.profile_picture ? (
                <img
                  src={facilitatorDetails.profile_picture}
                  alt={facilitatorDetails.title || "Facilitator"}
                  className="h-10 w-10 rounded-full object-cover border-2 border-white/30"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                  {(facilitatorDetails.title || "F")[0]}
                </div>
              )}
              <div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Your Facilitator</p>
                <p className="text-white font-semibold">{facilitatorDetails.title || "AI Facilitator"}</p>
              </div>
            </div>
          )}

          <div className="p-6">
            {/* Session title + participant count */}
            <div className="mb-5">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{sessionTitle}</h1>
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Users className="h-3.5 w-3.5 shrink-0" />
                {effectiveMaxParticipants > 0 ? (
                  <span>{currentParticipantCount} / {effectiveMaxParticipants} participants joined</span>
                ) : (
                  <span>{currentParticipantCount} participant{currentParticipantCount !== 1 ? 's' : ''} joined</span>
                )}
              </div>

              {/* Session metadata chips */}
              {(durationMinutes || difficultyLevel || sessionType || languageLabel) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {durationMinutes && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                      <Clock className="h-3 w-3 text-indigo-400" />
                      {durationMinutes} min
                    </span>
                  )}
                  {difficultyLevel && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-1 capitalize">
                      <BarChart2 className="h-3 w-3 text-violet-400" />
                      {difficultyLevel}
                    </span>
                  )}
                  {sessionType && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-1 capitalize">
                      <Tag className="h-3 w-3 text-emerald-400" />
                      {sessionType}
                    </span>
                  )}
                  {languageLabel && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                      <Globe className="h-3 w-3 text-sky-400" />
                      {languageLabel}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                <Headphones className="h-3.5 w-3.5" />
                Voice-first workshop mode
              </div>
              <div className="grid gap-2 text-xs leading-relaxed text-indigo-900 sm:grid-cols-3">
                <div className="rounded-xl bg-white/80 p-2.5">
                  <Mic className="mb-1 h-4 w-4 text-indigo-500" />
                  Speak your answers with the microphone where supported; you can review the transcript before sending.
                </div>
                <div className="rounded-xl bg-white/80 p-2.5">
                  <Headphones className="mb-1 h-4 w-4 text-indigo-500" />
                  Use Read aloud on facilitator messages to experience the AI as a spoken moderator.
                </div>
                <div className="rounded-xl bg-white/80 p-2.5">
                  <Video className="mb-1 h-4 w-4 text-indigo-500" />
                  Want live cameras too? Keep your Teams, Zoom, or Meet call open alongside this workshop room.
                </div>
              </div>
            </div>

            {/* Error state */}
            {error && (
              <div className="p-3.5 mb-4 border border-red-100 bg-red-50 rounded-xl text-red-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Unable to join the session yet</p>
                    <p className="text-xs text-red-500 mt-0.5 leading-relaxed">{error}</p>
                    <p className="text-xs text-red-500/80 mt-1 leading-relaxed">Retry if the host has just opened the room, or ask the host for a fresh link if the issue continues.</p>
                    <Button
                      onClick={onRetry}
                      className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 text-xs py-1 px-2 h-auto"
                      variant="ghost"
                      size="sm"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Inline preparing-session status — shown after join while AI generates welcome */}
            {isPreparingSession && (
              <div className="mb-4 flex items-center gap-3 p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                <div className="shrink-0">
                  <svg className="w-5 h-5 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-800">Preparing your session…</p>
                  <p className="text-xs text-indigo-500 mt-0.5 leading-relaxed">The AI moderator is preparing the first spoken-friendly prompt. Please keep this page open; the workshop room will open automatically.</p>
                </div>
              </div>
            )}

            {/* Full or Join form */}
            {isFull ? (
              <SessionFullAlert type="full" />
            ) : (
              <JoinForm
                participantName={participantName}
                onNameChange={onNameChange}
                avatarSeed={avatarSeed}
                onAvatarChange={onAvatarChange}
                onJoinSession={handleJoinClick}
                isJoining={isJoining}
                currentParticipantCount={currentParticipantCount}
                effectiveMaxParticipants={effectiveMaxParticipants}
              />
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by AIfacilitator · AI-driven workshop facilitation
        </p>
      </div>
    </div>
  );
};

export default JoinSessionMain;
