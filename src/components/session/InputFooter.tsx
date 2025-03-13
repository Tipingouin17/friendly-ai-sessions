
import React, { useEffect } from 'react';
import ChatInput from "@/components/chat/ChatInput";
import { Message, ParticipantInfo } from "@/types/chat";
import { Badge } from "@/components/ui/badge";
import { EyeOff, Users, CheckCircle2 } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

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
  messages?: Message[];
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
  messages = [] // Provide default empty array
}: InputFooterProps) => {
  // Use the mobile hook
  const mobileState = useIsMobile();
  const isMobile = mobileState === true;
  
  // Find current participant info
  const participantInfo = participants.find(p => p.id === currentParticipant);
  const participantName = participantInfo?.name || 
    participantNames[currentParticipant] || 
    `Participant ${currentParticipant}`;
  
  // Safely determine if this is a new session with just a welcome message
  // Ensure messages is an array before trying to use array methods
  const isNewSession = Array.isArray(messages) && messages.length <= 1 && 
    messages.every(msg => msg.sender === 'assistant' || msg.id === 'welcome');
  
  // Check if the most recent message is from the facilitator 
  // If so, we should allow the participant to answer
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const shouldAllowAnswer = lastMessage?.sender === 'assistant' || isNewSession || !hasAnswered;
  
  // Log debug info for input visibility
  useEffect(() => {
    console.log("InputFooter state:", { 
      hasAnswered, 
      isNewSession, 
      lastMessageSender: lastMessage?.sender,
      shouldAllowAnswer,
      messagesCount: messages.length,
      viewMode
    });
  }, [hasAnswered, isNewSession, lastMessage, shouldAllowAnswer, messages.length, viewMode]);
  
  // In admin view, we don't show the input at all
  if (viewMode === "admin") {
    return null;
  }
  
  return (
    <>
      <div className={`px-2 sm:px-4 py-2 border-t border-gray-100 bg-white flex items-center ${isMobile ? 'justify-center sm:justify-between' : 'justify-between'}`}>
        <div className="flex items-center gap-1 sm:gap-2">
          <Badge variant="outline" className="bg-gray-50 text-xs sm:text-sm px-1.5 sm:px-2 py-1">
            <Users className="w-3 h-3 mr-1" />
            <span>{totalResponses} of {participantCount} answered</span>
          </Badge>
        </div>
        
        {shouldAllowAnswer && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle 
                  pressed={isAnonymous} 
                  onPressedChange={toggleAnonymous}
                  size="sm"
                  variant="outline"
                  className={isAnonymous ? "bg-gray-100 text-xs sm:text-sm" : "text-xs sm:text-sm"}
                >
                  <EyeOff className="h-3 w-3 mr-1" />
                  <span className={isMobile ? "hidden sm:inline" : ""}>Anonymous</span>
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
        {/* Always show input for participant view for now */}
        {viewMode === "participant" ? (
          <ChatInput
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            onSendMessage={onSendMessage}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            placeholder={`Type as ${participantName}...`}
            disabled={false}
            isMobile={isMobile}
          />
        ) : (
          <div className="p-3 sm:p-6 flex flex-col items-center justify-center">
            <div className="mb-2 sm:mb-4 flex items-center justify-center gap-2 bg-green-50 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-green-700 border border-green-200 w-full text-sm sm:text-base">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="font-medium">Your answer has been submitted</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500">
              Waiting for other participants to respond...
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default InputFooter;
