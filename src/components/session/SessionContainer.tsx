
import React, { useEffect, useState } from "react";
import MessagingArea from "./MessagingArea";
import { Message, ParticipantInfo } from "@/types/chat";
import { useParticipantNamesStore } from "@/stores/participantNamesStore";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { ConversationWithSession } from "@/types/database";
import { getParticipantColor } from "@/utils/sessionHelpers";
import AdminHeader from "./AdminHeader";
import InputFooter from "./InputFooter";

interface SessionContainerProps {
  participantCount: number;
  conversation: ConversationWithSession | null;
  messages: Message[];
  inputMessage: string;
  setInputMessage: (message: string) => void;
  currentParticipant: number;
  onSendMessage: () => void;
  onLikeMessage: (messageId: string) => void;
  onGenerateReport: () => void;
  isGeneratingReport: boolean;
  isWaitingForResponse: boolean;
  setIsRecording: (isRecording: boolean) => void;
  isRecording: boolean;
  participantColors: { [key: string]: string };
  participantNames: { [key: number]: string };
  participants: ParticipantInfo[];
  conversationId: number | null;
  facilitator: any;
  objective: string;
  currentParticipantCount: number;
  currentUserParticipantId: number | null;
  hasAnswered: boolean;
  totalResponses: number;
  viewMode: "participant" | "admin";
  setViewMode: (mode: "participant" | "admin") => void;
  isAdmin: boolean;
  onSendAdminMessage?: (message: string) => void;
}

const SessionContainer: React.FC<SessionContainerProps> = ({
  participantCount,
  conversation,
  messages,
  inputMessage,
  setInputMessage,
  currentParticipant,
  onSendMessage,
  onLikeMessage,
  onGenerateReport,
  isGeneratingReport,
  isWaitingForResponse,
  setIsRecording,
  isRecording,
  participantColors,
  participantNames,
  participants,
  conversationId,
  facilitator,
  objective,
  currentParticipantCount,
  currentUserParticipantId,
  hasAnswered,
  totalResponses,
  viewMode,
  setViewMode,
  isAdmin,
  onSendAdminMessage
}) => {
  const { isMobile } = useBreakpoint("md");
  const { participantNames: storedParticipantNames } = useParticipantNamesStore();
  // Combined participant names from props and store
  const allParticipantNames = { ...storedParticipantNames, ...participantNames };
  
  // Calculate participant colors if needed
  const enhancedParticipantColors = { ...participantColors };
  participants.forEach(p => {
    const key = `P${p.id}`;
    if (!enhancedParticipantColors[key]) {
      enhancedParticipantColors[key] = getParticipantColor(key);
    }
  });
  
  // Anonymous state
  const [isAnonymous, setIsAnonymous] = useState(false);
  const toggleAnonymous = () => setIsAnonymous(prev => !prev);
  
  // Debug logging for messages
  useEffect(() => {
    console.log(`SessionContainer - Rendering with ${messages.length} messages, participant: ${currentParticipant}, hasAnswered: ${hasAnswered}`);
  }, [messages.length, currentParticipant, hasAnswered]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Admin header in admin mode */}
      {isAdmin && (
        <AdminHeader
          facilitator={facilitator}
          objective={objective}
          conversationId={conversationId}
          isAdmin={isAdmin}
          onSendAdminMessage={onSendAdminMessage}
          onGenerateReport={onGenerateReport}
          isGeneratingReport={isGeneratingReport}
          currentParticipantCount={currentParticipantCount}
          maxParticipants={participantCount}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      )}
      
      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        <MessagingArea
          messages={messages}
          participantColors={enhancedParticipantColors}
          currentParticipant={currentParticipant}
          isWaitingForResponse={isWaitingForResponse}
          onLikeMessage={onLikeMessage}
          participants={participants}
          conversationId={conversationId}
          currentParticipantCount={currentParticipantCount}
          maxParticipants={participantCount}
          isMobile={isMobile}
          viewMode={viewMode}
          isAdmin={isAdmin}
        />
      </div>
      
      {/* Input footer in participant mode - handle in MessagingArea component now */}
      {!isAdmin && viewMode === "participant" && (
        <div className="hidden">
          <InputFooter
            participantCount={participantCount}
            currentParticipant={currentParticipant}
            participantNames={allParticipantNames}
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
            messages={messages}
          />
        </div>
      )}
    </div>
  );
};

export default SessionContainer;
