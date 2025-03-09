
import React from 'react';
import { useSessionContainer } from "@/hooks/useSessionContainer";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useAnonymousState } from "@/hooks/useAnonymousState";
import { useMessageProcessor } from "@/hooks/useMessageProcessor";
import { Message, ParticipantInfo } from "@/types/chat";
import SessionLayout from "./SessionLayout";
import SessionHeader from "./SessionHeader";
import MessagingArea from "./MessagingArea";
import InputFooter from "./InputFooter";
import QrDialogManager from "./QrDialogManager";
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
  const processedMessages = useMessageProcessor({
    messages,
    viewMode,
    participants,
    participantNames,
    currentParticipant
  });

  return (
    <SessionLayout>
      <SessionHeader 
        facilitator={facilitator}
        objective={objective}
        participantCount={currentParticipantCount || participants.length || participantCount}
        onGenerateReport={handleGenerateReport}
        isGeneratingReport={isGeneratingReport}
        canGenerateReports={canGenerateReports}
        messagesCount={messages.length}
        viewMode={viewMode}
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
      
      <QrDialogManager
        isMobile={isMobile}
        viewMode={viewMode}
        isQrDialogOpen={isQrDialogOpen}
        setIsQrDialogOpen={setIsQrDialogOpen}
        joinUrl={joinUrl}
        currentParticipantCount={currentParticipantCount || participants.length || 0}
        maxParticipants={conversation?.participants || 0}
      />
      
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
    </SessionLayout>
  );
};

export default SessionContainer;
