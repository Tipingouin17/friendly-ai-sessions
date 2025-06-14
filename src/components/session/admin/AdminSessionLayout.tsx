
import React from "react";
import AdminHeader from "./AdminHeader";
import AdminSessionContent from "./AdminSessionContent";
import { Message, ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";

interface AdminSessionLayoutProps {
  conversationData: ConversationWithSession | null;
  exportSessionData: () => void;
  handleSendAdminMessage: (message: string, isPinned?: boolean, recipientId?: string) => void;
  toggleSessionState: () => void;
  isSessionPaused: boolean;
  sessionMessages: Message[];
  participantColors: { [key: string]: string };
  participants: ParticipantInfo[];
  isLoadingParticipants: boolean;
  currentConversationId: number | null;
}

const AdminSessionLayout: React.FC<AdminSessionLayoutProps> = ({
  conversationData,
  exportSessionData,
  handleSendAdminMessage,
  toggleSessionState,
  isSessionPaused,
  sessionMessages,
  participantColors,
  participants,
  isLoadingParticipants,
  currentConversationId
}) => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AdminHeader
        conversation={conversationData}
        isSessionPaused={isSessionPaused}
        toggleSessionState={toggleSessionState}
        onExportData={exportSessionData}
      />
      
      <AdminSessionContent
        sessionMessages={sessionMessages}
        participantColors={participantColors}
        conversationData={conversationData}
        participants={participants}
        isLoadingParticipants={isLoadingParticipants}
        currentConversationId={currentConversationId}
        onSendMessage={handleSendAdminMessage}
      />
    </div>
  );
};

export default AdminSessionLayout;
