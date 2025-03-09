
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
}

const QrDialogManager = ({
  isMobile,
  viewMode,
  isQrDialogOpen,
  setIsQrDialogOpen,
  joinUrl,
  currentParticipantCount,
  maxParticipants
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
      />
    );
  }
  
  return null;
};

export default QrDialogManager;
