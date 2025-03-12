import React from 'react';
import { useSessionContainerState } from "@/hooks/useSessionContainerState";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import SessionLayout from "./SessionLayout";
import MessagingArea from "./MessagingArea";
import InputFooter from "./InputFooter";
import SessionHeaderManager from "./SessionHeaderManager";
import ViewModeSelector from "./ViewModeSelector";
import SessionQrManager from "./SessionQrManager";
import AdminNotificationManager from "./AdminNotificationManager";
import SessionJoinInfo from "./SessionJoinInfo";

interface SessionContainerProps {
  facilitator: {
    title?: string;
    profile_picture?: string;
  };
  objective?: string;
  participantCount: number;
  messages: any[];
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
  participants?: any[];
  conversationId?: number | null;
  conversation?: any;
  currentParticipantCount?: number;
  currentUserParticipantId?: number | null;
  hasAnswered: boolean;
  totalResponses: number;
  viewMode: "participant" | "admin";
  setViewMode: (mode: "participant" | "admin") => void;
  isAdmin: boolean;
  onSendAdminMessage?: (message: string) => void;
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
  isAdmin,
  onSendAdminMessage
}: SessionContainerProps) => {
  const { canGenerateReports } = usePlanLimits();
  
  const {
    adminNotification,
    setAdminNotification,
    isMobile,
    joinUrl,
    isQrDialogOpen,
    setIsQrDialogOpen,
    handleGenerateReport,
    isAnonymous,
    toggleAnonymous,
    processedMessages
  } = useSessionContainerState({
    conversationId: conversationId || null,
    currentUserParticipantId: currentUserParticipantId || null,
    canGenerateReports,
    onGenerateReport,
    messages,
    viewMode,
    participants,
    participantNames,
    currentParticipant
  });

  return (
    <SessionLayout>
      <SessionHeaderManager 
        isAdmin={isAdmin}
        facilitator={facilitator}
        objective={objective}
        participantCount={participantCount}
        currentParticipantCount={currentParticipantCount}
        maxParticipants={conversation?.participants || 0}
        onGenerateReport={handleGenerateReport}
        isGeneratingReport={isGeneratingReport}
        canGenerateReports={canGenerateReports}
        messagesCount={messages.length}
        viewMode={viewMode}
        onSendAdminMessage={onSendAdminMessage}
        isSessionActive={true}
      />
      
      <ViewModeSelector 
        viewMode={viewMode} 
        setViewMode={setViewMode}
        isAdmin={isAdmin}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <div className={`flex-1 ${viewMode === "admin" ? "" : "overflow-hidden"}`}>
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
            isAdmin={isAdmin}
          />
        </div>
        
        {isAdmin && (
          <div className="hidden md:block w-64 p-4 shrink-0">
            <SessionJoinInfo
              conversationId={conversationId || null}
              currentParticipantCount={currentParticipantCount || participants.length || 0}
              maxParticipants={conversation?.participants || 0}
              isAdmin={isAdmin}
            />
          </div>
        )}
      </div>
      
      <SessionQrManager
        isAdmin={isAdmin}
        viewMode={viewMode}
        isMobile={isMobile}
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
      
      <AdminNotificationManager 
        isAdmin={isAdmin}
        message={adminNotification}
        onClose={() => setAdminNotification(null)}
      />
    </SessionLayout>
  );
};

export default SessionContainer;

