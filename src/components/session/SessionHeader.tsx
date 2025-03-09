
import React, { useEffect, useState } from 'react';
import ChatHeader from "@/components/chat/ChatHeader";
import { getFacilitatorAvatarUrl, handleAvatarError } from "@/utils/facilitatorUtils";

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
  const [profilePicture, setProfilePicture] = useState<string>('/placeholder.svg');
  
  useEffect(() => {
    const loadProfilePicture = async () => {
      if (facilitator) {
        const avatarUrl = await getFacilitatorAvatarUrl(facilitator);
        setProfilePicture(avatarUrl);
      }
    };
    
    loadProfilePicture();
  }, [facilitator]);

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
      onImageError={handleAvatarError}
    />
  );
};

export default SessionHeader;
