
import React from 'react';
import AdminHeader from './admin/AdminHeader';

interface SessionHeaderManagerProps {
  conversation: any;
  isSessionPaused: boolean;
  toggleSessionState: () => void;
}

const SessionHeaderManager: React.FC<SessionHeaderManagerProps> = ({
  conversation,
  isSessionPaused,
  toggleSessionState
}) => {
  return (
    <AdminHeader
      conversation={conversation}
      isSessionPaused={isSessionPaused}
      toggleSessionState={toggleSessionState}
    />
  );
};

export default SessionHeaderManager;
