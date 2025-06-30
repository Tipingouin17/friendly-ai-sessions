
import React from "react";
import HostHeader from "./HostHeader";
import HostSessionContent from "./HostSessionContent";
import { Message, ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";

interface HostDashboardProps {
  conversation: ConversationWithSession | null;
  isSessionPaused: boolean;
  toggleSessionState: () => void;
  sessionMessages: Message[];
  participantColors: { [key: string]: string };
  participants: ParticipantInfo[];
  isLoadingParticipants: boolean;
  currentConversationId: number | null;
  onSendMessage: (message: string, isPinned?: boolean, recipientId?: string) => void;
  
  // Response collection props
  isWaitingForResponses?: boolean;
  responseCount?: number;
  totalParticipants?: number;
  onTriggerFacilitatorResponse?: () => void;
  
  // Session start props
  isSessionStarted?: boolean;
  onSessionStarted?: () => void;
  isStartingSession?: boolean;
  startProgress?: string;
}

const HostDashboard: React.FC<HostDashboardProps> = ({
  conversation,
  isSessionPaused,
  toggleSessionState,
  sessionMessages,
  participantColors,
  participants,
  isLoadingParticipants,
  currentConversationId,
  onSendMessage,
  isWaitingForResponses = false,
  responseCount = 0,
  totalParticipants = 1,
  onTriggerFacilitatorResponse,
  isSessionStarted = false,
  onSessionStarted,
  isStartingSession = false,
  startProgress
}) => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <HostHeader
        conversation={conversation}
        isSessionPaused={isSessionPaused}
        toggleSessionState={toggleSessionState}
      />
      
      <HostSessionContent
        sessionMessages={sessionMessages}
        participantColors={participantColors}
        conversationData={conversation}
        participants={participants}
        isLoadingParticipants={isLoadingParticipants}
        currentConversationId={currentConversationId}
        onSendMessage={onSendMessage}
        isWaitingForResponses={isWaitingForResponses}
        responseCount={responseCount}
        totalParticipants={totalParticipants}
        onTriggerFacilitatorResponse={onTriggerFacilitatorResponse}
        isSessionStarted={isSessionStarted}
        onSessionStarted={onSessionStarted}
        isStartingSession={isStartingSession}
        startProgress={startProgress}
      />
    </div>
  );
};

export default HostDashboard;
