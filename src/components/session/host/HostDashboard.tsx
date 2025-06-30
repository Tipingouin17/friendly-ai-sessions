
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
  
  // Auto-start props
  isAutoStarting?: boolean;
  autoStartCountdown?: number;
  onCancelAutoStart?: () => void;
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
  isAutoStarting = false,
  autoStartCountdown = 0,
  onCancelAutoStart
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
        isAutoStarting={isAutoStarting}
        autoStartCountdown={autoStartCountdown}
        onCancelAutoStart={onCancelAutoStart}
      />
    </div>
  );
};

export default HostDashboard;
