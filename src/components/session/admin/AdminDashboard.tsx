/**
 * Admin Dashboard
 *
 * Session component for the AIfacilitator application.
 */

import React from "react";
import AdminHeader from "./AdminHeader";
import AdminSessionContent from "./AdminSessionContent";
import { Message, ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";

interface AdminDashboardProps {
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
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
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
  onSessionStarted
}) => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AdminHeader
        conversation={conversation}
        isSessionPaused={isSessionPaused}
        toggleSessionState={toggleSessionState}
      />
      
      <AdminSessionContent
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
      />
    </div>
  );
};

export default AdminDashboard;
