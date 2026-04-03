/**
 * Session Qr Manager
 *
 * Session component for the AIfacilitator application.
 */

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
  /** UUID join token from the conversations table — required for secure join URLs */
  joinToken?: string | null;
}

const SessionQrManager: React.FC<SessionQrManagerProps> = ({
  isAdmin,
  viewMode,
  isMobile,
  isQrDialogOpen,
  setIsQrDialogOpen,
  joinUrl,
  currentParticipantCount,
  maxParticipants,
  joinToken
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
      joinToken={joinToken}
    />
  );
};

export default SessionQrManager;
