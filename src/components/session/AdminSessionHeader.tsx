
import React from 'react';
import SimplifiedAdminHeader from './admin/SimplifiedAdminHeader';

interface AdminSessionHeaderProps {
  conversationData: any;
  currentParticipantCount: number;
  isSessionPaused: boolean;
  onToggleSessionState: () => void;
  onSendAdminMessage: (message: string) => void;
  onExportData: () => void;
  totalMessages?: number;
}

const AdminSessionHeader: React.FC<AdminSessionHeaderProps> = ({
  conversationData,
  currentParticipantCount,
  isSessionPaused,
  onToggleSessionState,
  onSendAdminMessage,
  onExportData,
  totalMessages = 0
}) => {
  return (
    <SimplifiedAdminHeader 
      conversation={conversationData}
      isSessionPaused={isSessionPaused}
      toggleSessionState={onToggleSessionState}
      handleAdminMessage={onSendAdminMessage}
      onExportData={onExportData}
      currentParticipantCount={currentParticipantCount}
      maxParticipants={conversationData?.participants || 10}
      totalMessages={totalMessages}
    />
  );
};

export default AdminSessionHeader;
