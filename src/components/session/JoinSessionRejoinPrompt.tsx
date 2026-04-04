/**
 * Join Session Rejoin Prompt
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import { Zap, UserCheck, ArrowRight } from "lucide-react";
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
          <div className="p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-50 rounded-full">
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Welcome Back!</h1>
            <p className="text-gray-500 text-sm mb-6">
              You previously joined this session as{' '}
              <span className="font-semibold text-gray-700">{existingSessionData.name}</span>.
            </p>

            <div className="space-y-3">
              <Button
                onClick={onRejoin}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/20"
              >
                Rejoin as {existingSessionData.name}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>

              <Button
                onClick={onJoinAsNew}
                variant="ghost"
                className="w-full text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              >
                Join as a different participant
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by AIfacilitator · AI-driven workshop facilitation
        </p>
      </div>
    </div>
  );
};

export default JoinSessionRejoinPrompt;
