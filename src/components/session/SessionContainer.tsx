
import React, { useEffect } from "react";
import MessagingArea from "./MessagingArea";
import { Message, ParticipantInfo } from "@/types/chat";
import { getParticipantColor } from "@/utils/sessionHelpers";
import InputFooter from "./InputFooter";
import AdminSessionHeader from "./AdminSessionHeader";
import { useIsMobile } from "@/hooks/use-mobile";

interface SessionContainerProps {
  participantCount: number;
  conversation: any | null;
  messages: Message[];
  inputMessage: string;
  setInputMessage: (message: string) => void;
  currentParticipant: number;
  onSendMessage: () => void;
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
  isAnonymous?: boolean;
  toggleAnonymous?: () => void;
}

const SessionContainer: React.FC<SessionContainerProps> = ({
  participantCount,
  conversation,
  messages,
  inputMessage,
  setInputMessage,
  currentParticipant,
  onSendMessage,
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
  onSendAdminMessage,
  isAnonymous = false,
  toggleAnonymous = () => {}
}) => {
  const mobileState = useIsMobile();
  const isMobile = mobileState === true;
  
  // Combined participant names from props
  const allParticipantNames = { ...participantNames };
  
  // Calculate participant colors if needed
  const enhancedParticipantColors = { ...participantColors };
  participants.forEach(p => {
    const key = `P${p.id}`;
    if (!enhancedParticipantColors[key]) {
      enhancedParticipantColors[key] = getParticipantColor(key);
    }
  });
  
  // Debug logging for messages
  useEffect(() => {
    console.log(`SessionContainer - Rendering with ${messages.length} messages, participant: ${currentParticipant}, hasAnswered: ${hasAnswered}`);
  }, [messages.length, currentParticipant, hasAnswered]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Admin header in admin mode */}
      {isAdmin && (
        <AdminSessionHeader
          conversationData={conversation}
          currentParticipantCount={currentParticipantCount}
          isSessionPaused={false} // This would need to be passed as a prop if needed
          onToggleSessionState={() => {}} // This would need to be implemented if needed
          onSendAdminMessage={onSendAdminMessage || (() => {})}
          onExportData={onGenerateReport}
        />
      )}
      
      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        <MessagingArea
          messages={messages}
          participantColors={enhancedParticipantColors}
          currentParticipant={currentParticipant}
          isWaitingForResponse={isWaitingForResponse}
          participants={participants}
          conversationId={conversationId}
          currentParticipantCount={currentParticipantCount}
          maxParticipants={participantCount}
          isMobile={isMobile}
          viewMode={viewMode}
          isAdmin={isAdmin}
          
          // Pass input functionality props
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSendMessage={onSendMessage}
          isRecording={isRecording}
          setIsRecording={setIsRecording}
          isAnonymous={isAnonymous}
          toggleAnonymous={toggleAnonymous}
          hasAnswered={hasAnswered}
          totalResponses={totalResponses}
          participantNames={allParticipantNames}
          currentUserParticipantId={currentUserParticipantId}
        />
      </div>
    </div>
  );
};

export default SessionContainer;
