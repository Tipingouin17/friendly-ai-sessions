
import React from 'react';
import { useSessionContainer } from "@/hooks/useSessionContainer";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useAnonymousState } from "@/hooks/useAnonymousState";
import { Message, ParticipantInfo } from "@/types/chat";
import SessionHeader from "./SessionHeader";
import MessagingArea from "./MessagingArea";
import InputFooter from "./InputFooter";
import JoinSessionDialog from "./JoinSessionDialog";
import ViewModeToggle from "./ViewModeToggle";

interface SessionContainerProps {
  facilitator: {
    title?: string;
    profile_picture?: string;
  };
  objective?: string;
  participantCount: number;
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipant: number;
  inputMessage: string;
  isRecording: boolean;
  isGeneratingReport?: boolean;
  isWaitingForResponse?: boolean;
  setInputMessage: (message: string) => void;
  onSendMessage: () => void;
  setIsRecording: (isRecording: boolean) => void;
  onGenerateReport?: () => void;
  participantNames?: { [key: number]: string };
  onLikeMessage?: (messageId: string) => void;
  participants?: ParticipantInfo[];
  conversationId?: number | null;
  conversation?: any;
  currentParticipantCount?: number;
  currentUserParticipantId?: number | null;
  hasAnswered: boolean;
  totalResponses: number;
  viewMode: "participant" | "admin";
  setViewMode: (mode: "participant" | "admin") => void;
  isAdmin: boolean;
}

const SessionContainer = ({
  facilitator,
  objective,
  participantCount,
  messages,
  participantColors,
  currentParticipant,
  inputMessage,
  isRecording,
  isGeneratingReport,
  isWaitingForResponse = false,
  setInputMessage,
  onSendMessage,
  setIsRecording,
  onGenerateReport,
  participantNames = {},
  onLikeMessage,
  participants = [],
  conversationId,
  conversation,
  currentParticipantCount,
  currentUserParticipantId,
  hasAnswered,
  totalResponses,
  viewMode,
  setViewMode,
  isAdmin
}: SessionContainerProps) => {
  const { canGenerateReports } = usePlanLimits();
  
  const {
    isMobile,
    joinUrl,
    isQrDialogOpen,
    setIsQrDialogOpen,
    handleGenerateReport
  } = useSessionContainer({
    canGenerateReports,
    onGenerateReport,
    conversationId: conversationId || null
  });
  
  // Anonymous state management
  const { isAnonymous, toggleAnonymous } = useAnonymousState({
    conversationId,
    currentParticipantId: currentUserParticipantId
  });
  
  // Process messages based on view mode
  const processedMessages = React.useMemo(() => {
    if (viewMode === "admin") {
      // Admin sees all messages
      return messages.map(message => {
        if (message.participant && message.participant.startsWith('P')) {
          const participantNumber = parseInt(message.participant.slice(1));
          const participant = participants.find(p => p.id === participantNumber);
          
          // Add participant details
          if (participant) {
            return {
              ...message,
              participant: participant.name,
              avatar: participant.avatar,
              isAnonymous: participant.is_anonymous
            };
          }
          
          const name = participantNames[participantNumber];
          if (name) {
            return {
              ...message,
              participant: name
            };
          }
          return {
            ...message,
            participant: `Anonymous ${participantNumber}`
          };
        }
        return message;
      });
    } else {
      // Participant only sees facilitator messages and their own responses
      return messages.filter(message => {
        // Include all facilitator messages
        if (message.sender === "assistant") return true;
        
        // Include only this participant's messages
        if (message.participant === `P${currentParticipant}`) return true;
        
        // Exclude all other participant messages
        return false;
      }).map(message => {
        // Process the message the same way
        if (message.participant && message.participant.startsWith('P')) {
          const participantNumber = parseInt(message.participant.slice(1));
          const participant = participants.find(p => p.id === participantNumber);
          
          if (participant) {
            return {
              ...message,
              participant: participant.name,
              avatar: participant.avatar,
              isAnonymous: participant.is_anonymous
            };
          }
          
          const name = participantNames[participantNumber];
          if (name) {
            return {
              ...message,
              participant: name
            };
          }
          return {
            ...message,
            participant: `Anonymous ${participantNumber}`
          };
        }
        return message;
      });
    }
  }, [messages, viewMode, participants, participantNames, currentParticipant]);

  return (
    <div className="h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex flex-col">
      <div className="container mx-auto h-full max-w-4xl flex flex-col pt-4 sm:pt-16">
        <div className="flex-1 bg-white rounded-t-lg sm:rounded-t-3xl shadow-lg flex flex-col relative">
          <SessionHeader 
            facilitator={facilitator}
            objective={objective}
            participantCount={currentParticipantCount || participants.length || participantCount}
            onGenerateReport={handleGenerateReport}
            isGeneratingReport={isGeneratingReport}
            canGenerateReports={canGenerateReports}
            messagesCount={messages.length}
          />
          
          <ViewModeToggle 
            viewMode={viewMode} 
            setViewMode={setViewMode}
            isAdmin={isAdmin}
          />
          
          <MessagingArea 
            messages={processedMessages}
            participantColors={participantColors}
            currentParticipant={currentParticipant}
            isWaitingForResponse={isWaitingForResponse}
            onLikeMessage={onLikeMessage}
            participants={participants}
            conversationId={conversationId || null}
            currentParticipantCount={currentParticipantCount || participants.length || 0}
            maxParticipants={conversation?.participants || 0}
            isMobile={isMobile}
            viewMode={viewMode}
          />
          
          {isMobile && (
            <JoinSessionDialog 
              isOpen={isQrDialogOpen}
              setIsOpen={setIsQrDialogOpen}
              joinUrl={joinUrl}
              currentParticipantCount={currentParticipantCount || participants.length || 0}
              maxParticipants={conversation?.participants || 0}
            />
          )}
          
          <InputFooter 
            participantCount={participantCount}
            currentParticipant={currentParticipant}
            participantNames={participantNames}
            participants={participants}
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            onSendMessage={onSendMessage}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            currentUserParticipantId={currentUserParticipantId}
            isAnonymous={isAnonymous}
            toggleAnonymous={toggleAnonymous}
            hasAnswered={hasAnswered}
            totalResponses={totalResponses}
            viewMode={viewMode}
          />
        </div>
      </div>
    </div>
  );
};

export default SessionContainer;
