
import React from 'react';
import AdminHeader from './admin/AdminHeader';

interface AdminSessionHeaderProps {
  conversationData: any;
  currentParticipantCount: number;
  isSessionPaused: boolean;
  onToggleSessionState: () => void;
  onSendAdminMessage: (message: string) => void;
  onExportData: () => void;
}

const AdminSessionHeader: React.FC<AdminSessionHeaderProps> = ({
  conversationData,
  currentParticipantCount,
  isSessionPaused,
  onToggleSessionState,
  onSendAdminMessage,
  onExportData
}) => {
  return (
    <AdminHeader 
      sessionTitle={conversationData?.sessions?.title || "Session Admin Panel"}
      facilitatorTitle={conversationData?.sessions?.facilitator_details?.title || ""}
      currentParticipants={currentParticipantCount}
      maxParticipants={conversationData?.participants || 10}
      isSessionActive={!isSessionPaused}
      onToggleSessionState={onToggleSessionState}
      onSendAdminMessage={onSendAdminMessage}
      onExportData={onExportData}
      // Pass additional session details from conversationData
      sessionState={{
        objective: conversationData?.sessions?.objective || "",
        language: conversationData?.language || "English",
        sessionStarted: conversationData?.session_started || false
      }}
    />
  );
};

export default AdminSessionHeader;
