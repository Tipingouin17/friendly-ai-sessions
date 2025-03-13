
import React, { useEffect } from 'react';
import ChatInput from "@/components/chat/ChatInput";
import { ParticipantInfo } from "@/types/chat";
import { Badge } from "@/components/ui/badge";
import { EyeOff, Users, CheckCircle2 } from "lucide-react";
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
  messages: Message[];
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
  viewMode,
  messages
}: InputFooterProps) => {
  // Find current participant info
  const participantInfo = participants.find(p => p.id === currentParticipant);
  const participantName = participantInfo?.name || 
    participantNames[currentParticipant] || 
    `Participant ${currentParticipant}`;
  
  // Determine if this is a new session with just a welcome message
  const isNewSession = messages.length <= 1 && 
    messages.every(msg => msg.sender === 'assistant' || msg.id === 'welcome');
  
  // In admin view, we don't show the input at all
  if (viewMode === "admin") {
    return null;
  }
  
  return (
    <>
      <div className="px-4 py-2 border-t border-gray-100 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-gray-50">
            <Users className="w-3 h-3 mr-1" />
            <span>{totalResponses} of {participantCount} answered</span>
          </Badge>
        </div>
        
        {!hasAnswered && (
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
        )}
      </div>
      
      <div className="w-full border-t border-gray-100 bg-white/80 backdrop-blur-sm">
        {/* Show the chat input for new sessions or if the user hasn't answered yet */}
        {isNewSession || !hasAnswered ? (
          <ChatInput
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            onSendMessage={onSendMessage}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            placeholder={`Type as ${participantName}...`}
            disabled={false}
          />
        ) : (
          <div className="p-6 flex flex-col items-center justify-center">
            <div className="mb-4 flex items-center justify-center gap-2 bg-green-50 px-4 py-3 rounded-lg text-green-700 border border-green-200 w-full">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Your answer has been submitted</span>
            </div>
            <p className="text-sm text-gray-500">
              Waiting for other participants to respond...
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default InputFooter;
