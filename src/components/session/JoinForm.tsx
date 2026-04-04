/**
 * Join Form
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import AvatarSelector from './AvatarSelector';

interface JoinFormProps {
  participantName: string;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  avatarSeed: string;
  onAvatarChange: () => void;
  onJoinSession: () => void;
  isJoining: boolean;
  /** Extra disabled flag (e.g. token not ready yet) — disables without showing spinner */
  isDisabled?: boolean;
  currentParticipantCount: number;
  effectiveMaxParticipants: number;
}

const JoinForm: React.FC<JoinFormProps> = ({
  participantName,
  onNameChange,
  avatarSeed,
  onAvatarChange,
  onJoinSession,
  isJoining,
  isDisabled = false,
  currentParticipantCount,
  effectiveMaxParticipants
}) => {
  const isFull = effectiveMaxParticipants > 0 && currentParticipantCount >= effectiveMaxParticipants;

  return (
    <div className="space-y-4">
      <AvatarSelector
        avatarSeed={avatarSeed}
        onAvatarChange={onAvatarChange}
      />

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Your Name
        </label>
        <Input
          id="name"
          type="text"
          placeholder="Enter your name"
          value={participantName}
          onChange={onNameChange}
          className="w-full"
          autoComplete="name"
        />
      </div>

      <Button
        onClick={onJoinSession}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/20"
        disabled={isJoining || isDisabled || isFull || !participantName.trim()}
      >
        {isJoining ? (
          <span className="flex items-center justify-center">
            <span className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin mr-2"></span>
            Joining...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            Join Session <ArrowRight className="ml-2 w-4 h-4" />
          </span>
        )}
      </Button>
    </div>
  );
};

export default JoinForm;
