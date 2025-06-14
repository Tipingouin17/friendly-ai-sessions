
import React from 'react';
import { AlertCircle } from "lucide-react";
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
  onJoinSession: () => void;
  isJoining: boolean;
  currentParticipantCount: number;
  effectiveMaxParticipants: number;
  onRetry: () => void;
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
  onRetry
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Join Session</h1>
          {conversation && conversation.sessions && conversation.sessions.facilitator_details && (
            <p className="text-gray-600">
              You're joining a session with {conversation.sessions.facilitator_details.title || "Facilitator"}
            </p>
          )}
        </div>

        {error ? (
          <div className="p-4 mb-4 border border-red-100 bg-red-50 rounded-md text-red-700">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <div>
                <p>{error}</p>
                <Button 
                  onClick={onRetry}
                  className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 text-sm py-1 px-2"
                  variant="ghost"
                  size="sm"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {isFull ? (
          <SessionFullAlert type="full" />
        ) : (
          <JoinForm
            participantName={participantName}
            onNameChange={onNameChange}
            avatarSeed={avatarSeed}
            onAvatarChange={onAvatarChange}
            onJoinSession={onJoinSession}
            isJoining={isJoining}
            currentParticipantCount={currentParticipantCount}
            effectiveMaxParticipants={effectiveMaxParticipants}
          />
        )}
      </div>
    </div>
  );
};

export default JoinSessionMain;
