/**
 * Join Session Main
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import { AlertCircle, Users, Zap } from "lucide-react";
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
  currentParticipantCount,
  effectiveMaxParticipants,
  onRetry,
  isTokenReady = true
}) => {
  const facilitatorDetails = conversation?.sessions?.facilitator_details;
  const sessionTitle = conversation?.sessions?.title || "Workshop Session";

  const handleJoinClick = async () => {
    await onJoinSession();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center p-4">
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
            {/* Session title */}
            <div className="mb-5">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{sessionTitle}</h1>
              {effectiveMaxParticipants > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Users className="h-3.5 w-3.5" />
                  <span>{currentParticipantCount} / {effectiveMaxParticipants} participants joined</span>
                </div>
              )}
            </div>

            {/* Error state */}
            {error && (
              <div className="p-3.5 mb-4 border border-red-100 bg-red-50 rounded-xl text-red-700">
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
                isDisabled={!isTokenReady}
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
