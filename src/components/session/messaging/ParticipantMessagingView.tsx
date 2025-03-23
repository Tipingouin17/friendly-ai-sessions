
import React, { useEffect, useMemo } from 'react';
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
  // Use the mobile hook to get current screen size
  const mobileState = useIsMobile();
  const currentIsMobile = mobileState === true;
  
  // Filter messages for this participant using the messageProcessor hook
  const filteredMessages = useMessageProcessor({
    messages,
    viewMode: "participant", // Force participant view mode to ensure filtering
    participants,
    participantNames,
    currentParticipant: currentUserParticipantId || currentParticipant
  });
  
  // Debug logging
  useEffect(() => {
    console.log(`ParticipantMessagingView - Current participant ID: P${currentParticipant}`);
    console.log(`Original messages: ${messages.length}, Filtered messages: ${filteredMessages.length}`);
    console.log(`Current participants: ${currentParticipantCount}/${maxParticipants}`);
  }, [
    messages.length, 
    filteredMessages.length, 
    currentParticipant, 
    currentParticipantCount, 
    maxParticipants
  ]);
  
  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-hidden relative">
        <MessageList 
          messages={filteredMessages} 
          participantColors={participantColors}
          currentParticipant={`P${currentParticipant}`}
          isWaitingForResponse={isWaitingForResponse}
          participants={participants}
          isMobile={isMobile || currentIsMobile}
        />
      </div>
      
      {/* Footer with input and participant info */}
      <div className="shrink-0">
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
