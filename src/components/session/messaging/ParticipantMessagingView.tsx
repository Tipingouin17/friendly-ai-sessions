
import React, { useEffect } from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import MessageList from '@/components/chat/MessageList';
import InputFooter from '@/components/session/InputFooter';

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
  // Log messages for debugging - removed excessive logging that could cause rerenders
  useEffect(() => {
    console.log("ParticipantMessagingView - Current participant:", `P${currentParticipant}`);
    console.log("Messages in ParticipantMessagingView:", messages.length);
  }, [currentParticipant, messages.length]);
  
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={messages} 
          participantColors={participantColors}
          currentParticipant={`P${currentParticipant}`}
          onLikeMessage={onLikeMessage}
          isWaitingForResponse={isWaitingForResponse}
          participants={participants}
        />
      </div>
      
      {/* Add InputFooter component here */}
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
  );
};

export default ParticipantMessagingView;
