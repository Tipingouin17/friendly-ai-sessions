
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight } from "lucide-react";
import AvatarSelector from './AvatarSelector';

interface JoinFormProps {
  participantName: string;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  avatarSeed: string;
  onAvatarChange: () => void;
  onJoinSession: () => void;
  isJoining: boolean;
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
  currentParticipantCount,
  effectiveMaxParticipants
}) => {
  const isFull = effectiveMaxParticipants > 0 && currentParticipantCount >= effectiveMaxParticipants;
  const spotsLeft = effectiveMaxParticipants > 0 ? effectiveMaxParticipants - currentParticipantCount : 0;

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
          autoFocus
        />
      </div>

      <Button 
        onClick={onJoinSession} 
        className="w-full bg-[#FFC107] hover:bg-[#F5B800] text-black"
        disabled={isJoining || isFull || !participantName.trim()}
      >
        {isJoining ? (
          <span className="flex items-center justify-center">
            <span className="w-4 h-4 border-t-2 border-black border-solid rounded-full animate-spin mr-2"></span>
            Joining...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            Join Session <ArrowRight className="ml-2 w-4 h-4" />
          </span>
        )}
      </Button>
      
      <div className="text-center text-sm text-gray-600 flex items-center justify-center gap-1">
        <Users className="w-4 h-4" />
        <span>
          {currentParticipantCount} of {effectiveMaxParticipants || '∞'} participants
          {!isFull && effectiveMaxParticipants > 0 && (
            <span className="text-green-600 font-medium ml-1">
              ({spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left)
            </span>
          )}
        </span>
      </div>
    </div>
  );
};

export default JoinForm;
