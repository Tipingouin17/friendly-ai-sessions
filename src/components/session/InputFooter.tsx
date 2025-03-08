
import React from 'react';
import ChatInput from "@/components/chat/ChatInput";
import { ParticipantInfo } from "@/types/chat";
import { Badge } from "@/components/ui/badge";
import { EyeOff, Users } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface InputFooterProps {
  participantCount: number;
  currentParticipant: number;
  participantNames: { [key: number]: string };
  participants: ParticipantInfo[];
  inputMessage: string;
  setInputMessage: (message: string) => void;
  onSendMessage: () => void;
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
  currentUserParticipantId?: number | null;
  isAnonymous: boolean;
  toggleAnonymous: () => void;
  hasAnswered: boolean;
  totalResponses: number;
  viewMode: "participant" | "admin";
}

const InputFooter = ({
  participantCount,
  currentParticipant,
  participantNames,
  participants,
  inputMessage,
  setInputMessage,
  onSendMessage,
  isRecording,
  setIsRecording,
  currentUserParticipantId,
  isAnonymous,
  toggleAnonymous,
  hasAnswered,
  totalResponses,
  viewMode
}: InputFooterProps) => {
  // Find current participant info
  const participantInfo = participants.find(p => p.id === currentParticipant);
  const participantName = participantInfo?.name || 
    participantNames[currentParticipant] || 
    `Participant ${currentParticipant}`;
  
  // In admin view, we don't need input controls
  if (viewMode === "admin") {
    return (
      <div className="px-6 py-4 border-t border-gray-100 bg-white">
        <div className="text-center text-gray-500">
          <p>You're in admin view. Switch to participant view to send messages.</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="px-4 py-2 border-t border-gray-100 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-gray-50">
            <Users className="w-3 h-3 mr-1" />
            <span>{totalResponses} of {participantCount} answered</span>
          </Badge>
          
          {hasAnswered && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Your answer submitted
            </Badge>
          )}
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle 
                pressed={isAnonymous} 
                onPressedChange={toggleAnonymous}
                size="sm"
                variant="outline"
                className={isAnonymous ? "bg-gray-100" : ""}
              >
                <EyeOff className="h-3.5 w-3.5 mr-1" />
                Anonymous
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              <p>When enabled, your name will not be shown with your messages</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="w-full border-t border-gray-100 bg-white/80 backdrop-blur-sm">
        <ChatInput
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSendMessage={onSendMessage}
          isRecording={isRecording}
          setIsRecording={setIsRecording}
          placeholder={`Type as ${participantName}...`}
          disabled={hasAnswered}
        />
      </div>
    </>
  );
};

export default InputFooter;
