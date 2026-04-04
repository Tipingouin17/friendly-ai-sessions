/**
 * Host Session Content
 *
 * Session component for the AIfacilitator application.
 */

import React from "react";
import SimplifiedHostMessagingView from "@/components/session/messaging/SimplifiedHostMessagingView";
import HostParticipantList from "@/components/session/HostParticipantList";
import { Message, ParticipantInfo } from "@/types/chat";

interface HostSessionContentProps {
  sessionMessages: Message[];
  participantColors: { [key: string]: string };
  conversationData: any;
  participants: ParticipantInfo[];
  isLoadingParticipants: boolean;
  currentConversationId: number | null;
  onSendMessage?: (message: string, isPinned: boolean, recipientId?: string) => void;
  
  // Response collection props
  isWaitingForResponses?: boolean;
  responseCount?: number;
  totalParticipants?: number;
  onTriggerFacilitatorResponse?: (hostInstruction?: string) => void;
  
  // Session start props
  isSessionStarted?: boolean;
  onSessionStarted?: () => void;
  
  // Auto-start props
  isAutoStarting?: boolean;
  autoStartCountdown?: number;
  onCancelAutoStart?: () => void;

  // Session state
  isSessionEnded?: boolean;
  isSessionPaused?: boolean;
}

const HostSessionContent: React.FC<HostSessionContentProps> = ({
  sessionMessages,
  participantColors,
  conversationData,
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
  onCancelAutoStart,
  isSessionEnded = false,
  isSessionPaused = false,
}) => {
  // Use actual participant count from real-time data
  const actualParticipantCount = participants.length;

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-100">
      {/* Main intelligence panel */}
      <div className="flex-1 overflow-hidden bg-white m-3 mr-0 rounded-l-2xl border border-slate-200 shadow-sm">
        <SimplifiedHostMessagingView
          messages={sessionMessages || []}
          participantColors={participantColors}
          currentParticipantCount={actualParticipantCount}
          conversationData={conversationData}
          isWaitingForResponses={isWaitingForResponses}
          responseCount={responseCount}
          totalParticipants={totalParticipants}
          onTriggerFacilitatorResponse={onTriggerFacilitatorResponse}
          isSessionStarted={isSessionStarted}
          onSessionStarted={onSessionStarted}
          participants={participants}
          conversationId={currentConversationId}
          isAutoStarting={isAutoStarting}
          autoStartCountdown={autoStartCountdown}
          onCancelAutoStart={onCancelAutoStart}
          isSessionEnded={isSessionEnded}
          isSessionPaused={isSessionPaused}
        />
      </div>

      {/* Participant sidebar */}
      <HostParticipantList
        participants={participants || []}
        currentParticipantCount={actualParticipantCount}
        maxParticipants={conversationData?.participants || 10}
        isLoading={isLoadingParticipants}
        conversationData={conversationData}
        messages={sessionMessages}
        onSendMessage={onSendMessage}
      />
    </div>
  );
};

export default HostSessionContent;
