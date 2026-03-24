
import React, { useEffect } from "react";
import MessagingArea from "./MessagingArea";
import { Message, ParticipantInfo } from "@/types/chat";
import { getParticipantColor } from "@/utils/sessionHelpers";
import InputFooter from "./InputFooter";
import { useIsMobile } from "@/hooks/use-mobile";

interface SessionContainerProps {
  participantCount: number;
  conversation: any | null;
  messages: Message[];
  inputMessage: string;
  setInputMessage: (message: string) => void;
  currentParticipant: number;
  handleSendMessage: () => void; // renamed from onSendMessage for clarity
  onGenerateReport: () => void;
  isGeneratingReport: boolean;
  isWaitingForResponse: boolean;
  isWaitingForResponses?: boolean;
  responseCount?: number;
  totalParticipants?: number;
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
  handleSendMessage, // use handleSendMessage instead of onSendMessage
  onGenerateReport,
  isGeneratingReport,
  isWaitingForResponse,
  isWaitingForResponses = false,
  responseCount = 0,
  totalParticipants = 1,
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
  toggleAnonymous = () => { /* no-op */ }
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
  useEffect(() => { /* no-op */ }, [messages.length, currentParticipant, hasAnswered]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Main content area - admin header is now handled by AdminDashboard */}
      <div className={`flex-1 overflow-hidden ${!isAdmin && 'pt-2'}`}>
        <MessagingArea
          messages={messages}
          participantColors={enhancedParticipantColors}
          currentParticipant={currentParticipant}
          isWaitingForResponse={isWaitingForResponse}
          isWaitingForResponses={isWaitingForResponses}
          responseCount={responseCount}
          totalParticipants={totalParticipants}
          participants={participants}
          conversationId={conversationId}
          currentParticipantCount={currentParticipantCount}
          maxParticipants={participantCount}
          isMobile={isMobile}
          viewMode={viewMode}
          isAdmin={isAdmin}
          conversationData={conversation}
          
          // Pass input functionality props
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSendMessage={handleSendMessage} // fixed: use correct handler
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
