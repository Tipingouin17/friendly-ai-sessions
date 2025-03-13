
import React, { useEffect } from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import MessageList from '@/components/chat/MessageList';
import InputFooter from '@/components/session/InputFooter';
import { useIsMobile } from '@/hooks/use-mobile';

interface ParticipantMessagingViewProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipant: number;
  isWaitingForResponse?: boolean;
  onLikeMessage?: (messageId: string) => void;
  participants: ParticipantInfo[];
  conversationId: number | null;
  currentParticipantCount: number;
  maxParticipants: number;
  isMobile: boolean;
  
  // Add additional props needed for InputFooter
  inputMessage?: string;
  setInputMessage?: (message: string) => void;
  onSendMessage?: () => void;
  isRecording?: boolean;
  setIsRecording?: (isRecording: boolean) => void;
  isAnonymous?: boolean;
  toggleAnonymous?: () => void;
  hasAnswered?: boolean;
  totalResponses?: number;
  viewMode?: "participant" | "admin";
  participantNames?: { [key: number]: string };
  currentUserParticipantId?: number | null;
}

const ParticipantMessagingView: React.FC<ParticipantMessagingViewProps> = ({
  messages,
  participantColors,
  currentParticipant,
  isWaitingForResponse = false,
  onLikeMessage,
  participants,
  isMobile,
  conversationId,
  currentParticipantCount = 0,
  maxParticipants = 1,
  
  // InputFooter props with defaults
  inputMessage = '',
  setInputMessage = () => {},
  onSendMessage = () => {},
  isRecording = false,
  setIsRecording = () => {},
  isAnonymous = false,
  toggleAnonymous = () => {},
  hasAnswered = false,
  totalResponses = 0,
  viewMode = "participant",
  participantNames = {},
  currentUserParticipantId = null,
}) => {
  // Use the mobile hook to get current screen size
  const { isMobile: currentIsMobile } = useIsMobile();
  
  // Log messages for debugging - removed excessive logging that could cause rerenders
  useEffect(() => {
    console.log("ParticipantMessagingView - Current participant:", `P${currentParticipant}`);
    console.log("Messages in ParticipantMessagingView:", messages.length);
  }, [currentParticipant, messages.length]);
  
  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full">
      <div className="flex-1 overflow-hidden relative">
        <MessageList 
          messages={messages} 
          participantColors={participantColors}
          currentParticipant={`P${currentParticipant}`}
          onLikeMessage={onLikeMessage}
          isWaitingForResponse={isWaitingForResponse}
          participants={participants}
          isMobile={currentIsMobile}
        />
      </div>
      
      {/* Footer with input and participant info */}
      <div className="mt-auto">
        <InputFooter
          participantCount={maxParticipants}
          currentParticipant={currentParticipant}
          participantNames={participantNames}
          participants={participants}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSendMessage={onSendMessage}
          isRecording={isRecording}
          setIsRecording={setIsRecording}
          currentUserParticipantId={currentUserParticipantId !== null ? currentUserParticipantId : currentParticipant}
          isAnonymous={isAnonymous}
          toggleAnonymous={toggleAnonymous}
          hasAnswered={hasAnswered}
          totalResponses={totalResponses}
          viewMode={viewMode}
          messages={messages}
        />
      </div>
    </div>
  );
};

export default ParticipantMessagingView;
