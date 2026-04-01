
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
  isWaitingForResponses?: boolean;
  responseCount?: number;
  totalParticipants?: number;
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
  isWaitingForResponses = false,
  responseCount = 0,
  totalParticipants = 1,
  participants,
  isMobile,
  conversationId,
  currentParticipantCount = 0,
  maxParticipants = 1,
  conversationData,
  
  // InputFooter props with defaults
  inputMessage = '',
  setInputMessage = () => { /* no-op */ },
  onSendMessage = () => { /* no-op */ },
  isRecording = false,
  setIsRecording = () => { /* no-op */ },
  isAnonymous = false,
  toggleAnonymous = () => { /* no-op */ },
  hasAnswered = false,
  totalResponses = 0,
  viewMode = "participant",
  participantNames = { /* no-op */ },
  currentUserParticipantId = null,
  showResponseStats = false,
}) => {
  // Get current mobile state
  const isMobileDevice = useIsMobile();
  const isActuallyMobile = isMobile || isMobileDevice;
  
  // Check if session has ended
  const isSessionEnded = conversationData?.is_session_ended || conversationData?.status === 'completed';

  // Use the correct participant ID for filtering - prioritize currentUserParticipantId
  const effectiveParticipantId = currentUserParticipantId !== null ? currentUserParticipantId : currentParticipant;
  
  // Filter messages for this participant using the messageProcessor hook
  const filteredMessages = useMessageProcessor({
    messages,
    viewMode: "participant",
    participants,
    participantNames,
    currentParticipant: effectiveParticipantId
  });
  
  // Debug logging
  useEffect(() => { /* no-op */ }, [currentParticipant, currentUserParticipantId, effectiveParticipantId, filteredMessages.length, messages.length]);
  
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
            currentParticipant={`P${effectiveParticipantId}`}
            isWaitingForResponse={isWaitingForResponse}
            isWaitingForResponses={isWaitingForResponses}
            responseCount={responseCount}
            totalParticipants={totalParticipants}
            participants={participants}
            isMobile={isActuallyMobile}
            conversationData={conversationData}
          />
        </div>
        
        {/* Session ended banner — replaces the input footer */}
        {isSessionEnded ? (
          <div className="bg-amber-50 border-t border-amber-200 px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">This session has ended</p>
              <p className="text-xs text-amber-600">Thank you for your participation!</p>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              Return Home
            </button>
          </div>
        ) : (
          /* Fixed footer with input */
          <div className="fixed-input-footer shrink-0">
            <InputFooter
              participantCount={maxParticipants}
              currentParticipant={effectiveParticipantId}
              participantNames={participantNames}
              participants={participants}
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              onSendMessage={onSendMessage}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
              currentUserParticipantId={effectiveParticipantId}
              isAnonymous={isAnonymous}
              toggleAnonymous={toggleAnonymous}
              hasAnswered={hasAnswered}
              totalResponses={totalResponses}
              viewMode={viewMode}
              messages={messages}
              showResponseStats={showResponseStats}
            />
          </div>
        )}
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
