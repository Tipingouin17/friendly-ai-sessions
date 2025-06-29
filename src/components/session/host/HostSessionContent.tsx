
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
  onTriggerFacilitatorResponse?: () => void;
  
  // Session start props
  isSessionStarted?: boolean;
  onSessionStarted?: () => void;
  triggerSessionStart?: () => Promise<boolean>;
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
  triggerSessionStart
}) => {
  // Use actual participant count from real-time data
  const actualParticipantCount = participants.length;

  return (
    <div className="flex-1 flex overflow-hidden bg-gray-50">
      {/* Host monitoring view - full height */}
      <div className="flex-1 overflow-hidden bg-white m-4 mr-0 rounded-l-lg border border-r-0">
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
