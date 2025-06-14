
import React from "react";
import AdminHeader from "@/components/session/admin/AdminHeader";
import AdminSessionContent from "./AdminSessionContent";
import { Message, ParticipantInfo } from "@/types/chat";

interface AdminSessionLayoutProps {
  conversationData: any;
  exportSessionData: () => void;
  handleSendAdminMessage: (message: string) => void;
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
    <div className="flex flex-col h-screen">
      {/* Enhanced admin header with all functionalities */}
      <AdminHeader
        conversation={conversationData}
        isSessionPaused={isSessionPaused}
        toggleSessionState={toggleSessionState}
        handleAdminMessage={handleSendAdminMessage}
        onExportData={exportSessionData}
      />

      {/* Main content area */}
      <AdminSessionContent
        sessionMessages={sessionMessages}
        participantColors={participantColors}
        conversationData={conversationData}
        participants={participants}
        isLoadingParticipants={isLoadingParticipants}
        currentConversationId={currentConversationId}
      />
    </div>
  );
};

export default AdminSessionLayout;
