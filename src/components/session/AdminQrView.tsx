
import React from "react";
import QRCodeView from "./QRCodeView";

interface AdminQrViewProps {
  conversationId: number;
  currentParticipantCount: number;
  maxParticipants: number;
  facilitatorTitle?: string;
  onStartSession: () => void;
  onSessionFull: () => void;
}

const AdminQrView: React.FC<AdminQrViewProps> = ({
  conversationId,
  currentParticipantCount,
  maxParticipants,
  facilitatorTitle,
  onStartSession,
  onSessionFull
}) => {
  return (
    <QRCodeView
      conversationId={conversationId}
      currentParticipantCount={currentParticipantCount}
      maxParticipants={maxParticipants}
      facilitatorTitle={facilitatorTitle}
      onStartSession={onStartSession}
      onSessionFull={onSessionFull}
    />
  );
};

export default AdminQrView;
