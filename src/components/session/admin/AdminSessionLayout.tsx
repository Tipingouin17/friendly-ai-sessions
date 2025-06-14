
import React from 'react';
import { Message, ParticipantInfo } from "@/types/chat";
import AdminSessionHeader from '../AdminSessionHeader';
import AdminSessionMessages from '../AdminSessionMessages';

interface AdminSessionLayoutProps {
  conversationData: any;
  handleSendAdminMessage: (message: string, isPinned: boolean, recipientId?: string) => void;
  toggleSessionState: () => void;
  isSessionPaused: boolean;
  sessionMessages: Message[];
  participantColors: { [key: string]: string };
  participants: ParticipantInfo[];
  isLoadingParticipants: boolean;
  currentConversationId: number | null;
  isWaitingForResponses: boolean;
  responseCount: number;
  totalParticipants: number;
  onTriggerFacilitatorResponse: () => void;
}

const AdminSessionLayout: React.FC<AdminSessionLayoutProps> = ({
  conversationData,
  handleSendAdminMessage,
  toggleSessionState,
  isSessionPaused,
  sessionMessages,
  participantColors,
  participants,
  isLoadingParticipants,
  currentConversationId,
  isWaitingForResponses,
  responseCount,
  totalParticipants,
  onTriggerFacilitatorResponse
}) => {
  const handleSessionStarted = () => {
    // Trigger any necessary updates when session starts
    console.log("Session started callback in AdminSessionLayout");
    // You might want to refresh data or trigger other actions here
  };

  // Wrapper function to match AdminSessionHeader's expected signature
  const handleHeaderSendMessage = (message: string) => {
    handleSendAdminMessage(message, false); // Default isPinned to false, no recipientId
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <AdminSessionHeader
        conversationData={conversationData}
        currentParticipantCount={participants.length}
        isSessionPaused={isSessionPaused}
        onToggleSessionState={toggleSessionState}
        onSendAdminMessage={handleHeaderSendMessage}
        onExportData={onTriggerFacilitatorResponse}
      />
      
      <div className="flex-1 overflow-hidden">
        <AdminSessionMessages
          messages={sessionMessages}
          isLoading={isLoadingParticipants}
          participants={participants}
          conversationData={conversationData}
          onSendMessage={handleSendAdminMessage}
          conversationId={currentConversationId}
          onSessionStarted={handleSessionStarted}
        />
      </div>
    </div>
  );
};

export default AdminSessionLayout;
