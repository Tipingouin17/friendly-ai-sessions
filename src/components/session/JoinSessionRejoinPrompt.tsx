
import React from 'react';
import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExistingSessionData {
  name?: string;
  participantId?: number;
  avatarSeed?: string;
  isAdmin?: boolean;
}

interface JoinSessionRejoinPromptProps {
  existingSessionData: ExistingSessionData;
  onRejoin: () => void;
  onJoinAsNew: () => void;
}

const JoinSessionRejoinPrompt: React.FC<JoinSessionRejoinPromptProps> = ({
  existingSessionData,
  onRejoin,
  onJoinAsNew
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <UserCheck className="h-12 w-12 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome Back!</h1>
          <p className="text-gray-600">
            You've previously joined this session as <span className="font-medium">{existingSessionData.name}</span>.
          </p>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={onRejoin} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-black"
          >
            Rejoin as {existingSessionData.name}
          </Button>
          
          <div className="text-center">
            <Button 
              onClick={onJoinAsNew}
              variant="ghost" 
              className="text-gray-500 hover:text-gray-800"
            >
              Join as a different participant
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinSessionRejoinPrompt;
