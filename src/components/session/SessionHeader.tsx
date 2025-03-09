
import React from 'react';
import ChatHeader from "@/components/chat/ChatHeader";
import { getFacilitatorAvatarUrl } from "@/utils/facilitatorUtils";

interface SessionHeaderProps {
  facilitator: {
    title?: string;
    profile_picture?: string;
    id?: number;
  };
  objective?: string;
  participantCount: number;
  onGenerateReport?: () => void;
  isGeneratingReport?: boolean;
  canGenerateReports: boolean;
  messagesCount: number;
  viewMode: "participant" | "admin";
}

const SessionHeader = ({
  facilitator,
  objective,
  participantCount,
  onGenerateReport,
  isGeneratingReport,
  canGenerateReports,
  messagesCount,
  viewMode
}: SessionHeaderProps) => {
  // Get profile picture URL using the facilitator ID
  const profilePicture = facilitator?.id 
    ? getFacilitatorAvatarUrl(facilitator.id)
    : facilitator?.profile_picture || '/placeholder.svg';

  return (
    <ChatHeader 
      title={facilitator?.title}
      objective={objective}
      profilePicture={profilePicture}
      participantCount={participantCount}
      onGenerateReport={onGenerateReport}
      isGeneratingReport={isGeneratingReport}
      canGenerateReport={messagesCount > 0 && canGenerateReports}
      viewMode={viewMode}
      onImageError={(e) => {
        e.currentTarget.src = '/placeholder.svg';
      }}
    />
  );
};

export default SessionHeader;
