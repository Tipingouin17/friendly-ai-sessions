
import React from 'react';
import ChatInput from "@/components/chat/ChatInput";
import { Message, ParticipantInfo } from "@/types/chat";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2 } from "lucide-react";
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
  showResponseStats?: boolean;
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
  messages = [],
  showResponseStats = false
}: InputFooterProps) => {
  // Use the mobile hook
  const isMobile = useIsMobile();
  
  // Find current participant info
  const participantInfo = participants.find(p => p.id === currentParticipant);
  const participantName = participantInfo?.name || 
    participantNames[currentParticipant] || 
    `Participant ${currentParticipant}`;
  
  // Safely determine if this is a new session with just a welcome message
  const isNewSession = Array.isArray(messages) && messages.length <= 1 && 
    messages.every(msg => msg.sender === 'assistant' || msg.id === 'welcome');
  
  // Check if the most recent message is from the facilitator 
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const shouldAllowAnswer = lastMessage?.sender === 'assistant' || isNewSession || !hasAnswered;
  
  // In admin view, we don't show the input at all
  if (viewMode === "admin") {
    return null;
  }
  
  return (
    <>
      {showResponseStats && (
        <div className="px-2 py-1 border-t border-gray-100 bg-white">
          <Badge variant="outline" className="bg-gray-50 text-xs px-1.5 py-0.5">
            <Users className="w-3 h-3 mr-1" />
            <span>{totalResponses} of {participantCount} answered</span>
          </Badge>
        </div>
      )}
      
      <div className="w-full border-t border-gray-100 bg-white/90 backdrop-blur-sm">
        {/* Always show input for participant view for now */}
        {viewMode === "participant" ? (
          <ChatInput
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            onSendMessage={onSendMessage}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            placeholder={isMobile ? "Type message..." : `Type as ${participantName}...`}
            disabled={false}
            isMobile={isMobile}
          />
        ) : (
          <div className="p-3 sm:p-4 flex flex-col items-center justify-center">
            <div className="mb-2 flex items-center justify-center gap-2 bg-green-50 px-3 py-2 rounded-md text-green-700 border border-green-200 w-full text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">Your answer has been submitted</span>
            </div>
            <p className="text-xs text-gray-500">
              Waiting for other participants to respond...
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default InputFooter;
