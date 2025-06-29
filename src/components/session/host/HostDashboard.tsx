
import React from 'react';
import { ParticipantInfo, Message } from "@/types/chat";
import PreSessionHostView from './PreSessionHostView';
import SimplifiedHostMessagingView from '../messaging/SimplifiedHostMessagingView';

interface HostDashboardProps {
  conversation: any;
  isSessionPaused: boolean;
  toggleSessionState: () => void;
  sessionMessages: Message[];
  participantColors: { [key: string]: string };
  participants: ParticipantInfo[];
  isLoadingParticipants: boolean;
  currentConversationId: number | null;
  onSendMessage: (message: string, isPinned: boolean, recipientId?: string) => void;
  isWaitingForResponses?: boolean;
  responseCount?: number;
  totalParticipants?: number;
  onTriggerFacilitatorResponse?: () => void;
  isSessionStarted?: boolean;
  onSessionStarted?: () => void;
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
  totalParticipants = 0,
  onTriggerFacilitatorResponse,
  isSessionStarted = false,
  onSessionStarted
}) => {
  console.log("🔍 HostDashboard - Props:", {
    conversationId: currentConversationId,
    participantCount: participants?.length || 0,
    isSessionStarted,
    sessionStarted: conversation?.session_started
  });

  // Show pre-session view if session hasn't started
  if (!isSessionStarted && !conversation?.session_started) {
    return (
      <PreSessionHostView
        conversationData={conversation}
        conversationId={currentConversationId}
        participantCount={participants?.length || 0}
        participants={participants || []}
        onSessionStarted={onSessionStarted || (() => {})}
      />
    );
  }

  // Show session messaging view when session is active
  return (
    <SimplifiedHostMessagingView
      messages={sessionMessages}
      participantColors={participantColors}
      currentParticipantCount={participants?.length || 0}
      conversationData={conversation}
      isWaitingForResponses={isWaitingForResponses}
      responseCount={responseCount}
      totalParticipants={totalParticipants}
      onTriggerFacilitatorResponse={onTriggerFacilitatorResponse}
      isSessionStarted={true}
      onSessionStarted={onSessionStarted}
      participants={participants}
      conversationId={currentConversationId}
    />
  );
};

export default HostDashboard;
