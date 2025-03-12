
import React from 'react';
import QrDialogManager from "./QrDialogManager";

interface SessionQrManagerProps {
  isAdmin: boolean;
  viewMode: "participant" | "admin";
  isMobile: boolean;
  isQrDialogOpen: boolean;
  setIsQrDialogOpen: (isOpen: boolean) => void;
  joinUrl: string;
  currentParticipantCount: number;
  maxParticipants: number;
}

const SessionQrManager: React.FC<SessionQrManagerProps> = ({
  isAdmin,
  viewMode,
  isMobile,
  isQrDialogOpen,
  setIsQrDialogOpen,
  joinUrl,
  currentParticipantCount,
  maxParticipants
}) => {
  // Only render for admin users, return null for participants
  if (!isAdmin) return null;
  
  return (
    <QrDialogManager
      isMobile={isMobile}
      viewMode={viewMode}
      isQrDialogOpen={isQrDialogOpen}
      setIsQrDialogOpen={setIsQrDialogOpen}
      joinUrl={joinUrl}
      currentParticipantCount={currentParticipantCount}
      maxParticipants={maxParticipants}
    />
  );
};

export default SessionQrManager;
