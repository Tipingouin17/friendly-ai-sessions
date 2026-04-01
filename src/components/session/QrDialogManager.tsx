
import React from 'react';
import JoinSessionDialog from "./JoinSessionDialog";

interface QrDialogManagerProps {
  isMobile: boolean;
  viewMode: "participant" | "admin";
  isQrDialogOpen: boolean;
  setIsQrDialogOpen: (isOpen: boolean) => void;
  joinUrl: string;
  currentParticipantCount: number;
  maxParticipants: number;
  /** UUID join token from the conversations table — required for secure join URLs */
  joinToken?: string | null;
}

const QrDialogManager = ({
  isMobile,
  viewMode,
  isQrDialogOpen,
  setIsQrDialogOpen,
  joinUrl,
  currentParticipantCount,
  maxParticipants,
  joinToken
}: QrDialogManagerProps) => {
  // Only show QR dialog for admin view on mobile
  if (isMobile && viewMode === "admin") {
    return (
      <JoinSessionDialog 
        isOpen={isQrDialogOpen}
        setIsOpen={setIsQrDialogOpen}
        joinUrl={joinUrl}
        currentParticipantCount={currentParticipantCount}
        maxParticipants={maxParticipants}
        joinToken={joinToken}
      />
    );
  }
  
  return null;
};

export default QrDialogManager;
