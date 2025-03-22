
import React from 'react';
import SessionHeader from "./SessionHeader";
import AdminHeader from "./admin/AdminHeader";

interface SessionHeaderManagerProps {
  isAdmin: boolean;
  facilitator: {
    title?: string;
    profile_picture?: string;
  };
  objective?: string;
  participantCount: number;
  currentParticipantCount?: number;
  maxParticipants: number;
  onGenerateReport?: () => void;
  isGeneratingReport?: boolean;
  canGenerateReports: boolean;
  messagesCount: number;
  viewMode: "participant" | "admin";
  onSendAdminMessage?: (message: string) => void;
  isSessionActive?: boolean;
  onToggleSessionState?: () => void;
  conversation?: any;
}

const SessionHeaderManager: React.FC<SessionHeaderManagerProps> = ({
  isAdmin,
  facilitator,
  objective,
  participantCount,
  currentParticipantCount = 0,
  maxParticipants = 0,
  onGenerateReport,
  isGeneratingReport = false,
  canGenerateReports,
  messagesCount,
  viewMode,
  onSendAdminMessage = () => {},
  isSessionActive = true,
  onToggleSessionState = () => {},
  conversation
}) => {
  if (isAdmin) {
    return (
      <AdminHeader 
        conversation={conversation}
        isSessionPaused={!isSessionActive}
        toggleSessionState={onToggleSessionState}
        handleAdminMessage={onSendAdminMessage}
      />
    );
  }
  
  return (
    <SessionHeader 
      facilitator={facilitator}
      objective={objective}
      participantCount={currentParticipantCount || participantCount}
      onGenerateReport={onGenerateReport}
      isGeneratingReport={isGeneratingReport}
      canGenerateReports={canGenerateReports}
      messagesCount={messagesCount}
      viewMode={viewMode}
    />
  );
};

export default SessionHeaderManager;
