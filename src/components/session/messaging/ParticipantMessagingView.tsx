
import React, { useEffect } from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import MessageList from '@/components/chat/MessageList';
import InputFooter from '@/components/session/InputFooter';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMessageProcessor } from '@/hooks/useMessageProcessor';

interface ParticipantMessagingViewProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipant: number;
  isWaitingForResponse?: boolean;
  participants: ParticipantInfo[];
  conversationId: number | null;
  currentParticipantCount: number;
  maxParticipants: number;
  isMobile: boolean;
  conversationData?: any; // Added to pass to MessageList
  
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
  showResponseStats?: boolean;
}

const ParticipantMessagingView: React.FC<ParticipantMessagingViewProps> = ({
  messages,
  participantColors,
  currentParticipant,
  isWaitingForResponse = false,
  participants,
  isMobile,
  conversationId,
  currentParticipantCount = 0,
  maxParticipants = 1,
  conversationData,
  
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
  showResponseStats = false,
}) => {
  // Get current mobile state
  const isMobileDevice = useIsMobile();
  
  // Filter messages for this participant using the messageProcessor hook
  // The hook is now guaranteed to return Message[] type
  const filteredMessages = useMessageProcessor({
    messages,
    viewMode: "participant", // Force participant view mode to ensure filtering
    participants,
    participantNames,
    currentParticipant: currentUserParticipantId || currentParticipant
  });
  
  return (
    <div className="message-area-container h-full flex flex-col">
      {/* Message list with flex-1 to take all available space */}
      <div className="message-container flex-1 overflow-hidden">
        <MessageList 
          messages={filteredMessages} 
          participantColors={participantColors}
          currentParticipant={`P${currentParticipant}`}
          isWaitingForResponse={isWaitingForResponse}
          participants={participants}
          isMobile={isMobile || isMobileDevice}
          conversationData={conversationData}
        />
      </div>
      
      {/* Fixed footer with input */}
      <div className="fixed-input-footer shrink-0">
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
          showResponseStats={showResponseStats}
        />
      </div>
    </div>
  );
};

export default ParticipantMessagingView;
