
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
  isSessionPaused,
  onToggleSessionState,
  onSendAdminMessage
}) => {
  return (
    <div className="pt-2">
      <AdminHeader 
        conversation={conversationData}
        isSessionPaused={isSessionPaused}
        toggleSessionState={onToggleSessionState}
        handleAdminMessage={onSendAdminMessage}
      />
    </div>
  );
};

export default AdminSessionHeader;
