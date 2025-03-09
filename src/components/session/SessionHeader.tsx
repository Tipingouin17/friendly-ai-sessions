
import React from 'react';
import ChatHeader from "@/components/chat/ChatHeader";

interface SessionHeaderProps {
  facilitator: {
    title?: string;
    profile_picture?: string;
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
  // Add error handling for profile_picture
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/placeholder.svg';
  };

  return (
    <ChatHeader 
      title={facilitator?.title}
      objective={objective}
      profilePicture={facilitator?.profile_picture}
      participantCount={participantCount}
      onGenerateReport={onGenerateReport}
      isGeneratingReport={isGeneratingReport}
      canGenerateReport={messagesCount > 0 && canGenerateReports}
      viewMode={viewMode}
      onImageError={handleImageError} // Changed from onProfilePictureError to match ChatHeader props
    />
  );
};

export default SessionHeader;
