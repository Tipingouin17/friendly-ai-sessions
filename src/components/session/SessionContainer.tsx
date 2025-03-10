import React, { useState } from 'react';
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
import SessionJoinInfo from "./SessionJoinInfo";
import AdminNotification from "./AdminNotification";
import AdminHeader from "./admin/AdminHeader";

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
  const [adminNotification, setAdminNotification] = useState<string | null>(null);
  
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
  
  const { isAnonymous, toggleAnonymous } = useAnonymousState({
    conversationId,
    currentParticipantId: currentUserParticipantId
  });
  
  const processedMessages = useMessageProcessor({
    messages,
    viewMode,
    participants,
    participantNames,
    currentParticipant
  });

  return (
    <SessionLayout>
      {isAdmin ? (
        <AdminHeader 
          sessionTitle={facilitator?.title || "Session"}
          facilitatorTitle={facilitator?.title || ""}
          currentParticipants={currentParticipantCount || participants.length || participantCount}
          maxParticipants={conversation?.participants || 0}
          isSessionActive={true}
          onToggleSessionState={() => {}}
          onSendAdminMessage={onSendAdminMessage}
          onExportData={onGenerateReport}
        />
      ) : (
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
      )}
      
      {isAdmin && (
        <ViewModeToggle 
          viewMode={viewMode} 
          setViewMode={setViewMode}
          isAdmin={isAdmin}
        />
      )}
      
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
          />
        </div>
        
        {viewMode === "admin" && !isMobile && isAdmin && (
          <div className="w-64 p-4 flex-shrink-0 border-l border-gray-100 overflow-y-auto">
            <SessionJoinInfo 
              conversationId={conversationId || null}
              currentParticipantCount={currentParticipantCount || participants.length || 0}
              maxParticipants={conversation?.participants || 0}
            />
          </div>
        )}
      </div>
      
      {isAdmin && viewMode === "admin" && (
        <QrDialogManager
          isMobile={isMobile}
          viewMode={viewMode}
          isQrDialogOpen={isQrDialogOpen}
          setIsQrDialogOpen={setIsQrDialogOpen}
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
      
      {!isAdmin && (
        <AdminNotification 
          message={adminNotification} 
          onClose={() => setAdminNotification(null)}
        />
      )}
    </SessionLayout>
  );
};

export default SessionContainer;
