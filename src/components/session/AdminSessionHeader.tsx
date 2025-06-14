
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
      conversationData={conversationData}
      onCloseAndReport={onExportData}
      onSendMessage={onSendAdminMessage}
      isGeneratingReport={false}
      participantCount={currentParticipantCount}
      maxParticipants={conversationData?.participants || 10}
      onWrapUp={onToggleSessionState}
      isWrappingUp={isSessionPaused}
    />
  );
};

export default AdminSessionHeader;
