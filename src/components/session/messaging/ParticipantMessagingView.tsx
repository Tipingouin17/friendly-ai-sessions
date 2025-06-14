
import React, { useEffect } from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import MessageList from '@/components/chat/MessageList';
import InputFooter from '@/components/session/InputFooter';
import SessionInfoPanel from '@/components/session/SessionInfoPanel';
import MobileSessionInfoSheet from '@/components/session/MobileSessionInfoSheet';
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
  conversationData?: any;
  
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
  const isActuallyMobile = isMobile || isMobileDevice;
  
  // Filter messages for this participant using the messageProcessor hook
  const filteredMessages = useMessageProcessor({
    messages,
    viewMode: "participant",
    participants,
    participantNames,
    currentParticipant: currentUserParticipantId || currentParticipant
  });
  
  return (
    <div className="h-full flex">
      {/* Mobile Header with Session Info Icon */}
      {isActuallyMobile && (
        <div className="absolute top-4 right-4 z-10">
          <MobileSessionInfoSheet
            conversationData={conversationData}
            participants={participants}
            currentParticipantCount={currentParticipantCount}
            maxParticipants={maxParticipants}
          />
        </div>
      )}
      
      {/* Main messaging area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Message list with flex-1 to take all available space */}
        <div className="message-container flex-1 overflow-hidden">
          <MessageList 
            messages={filteredMessages} 
            participantColors={participantColors}
            currentParticipant={`P${currentParticipant}`}
            isWaitingForResponse={isWaitingForResponse}
            participants={participants}
            isMobile={isActuallyMobile}
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

      {/* Desktop Session Info Panel */}
      {!isActuallyMobile && (
        <SessionInfoPanel
          conversationData={conversationData}
          participants={participants}
          currentParticipantCount={currentParticipantCount}
          maxParticipants={maxParticipants}
          className="shrink-0"
        />
      )}
    </div>
  );
};

export default ParticipantMessagingView;
