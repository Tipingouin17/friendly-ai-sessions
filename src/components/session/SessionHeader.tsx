
import React, { useEffect, useState } from 'react';
import ChatHeader from "@/components/chat/ChatHeader";
import { getFacilitatorAvatarUrl, handleAvatarError, validateImageUrl } from "@/utils/facilitatorUtils";

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
  const [validProfilePicture, setValidProfilePicture] = useState<string | null>(null);
  
  // Get profile picture URL using the facilitator ID
  useEffect(() => {
    const checkProfilePicture = async () => {
      if (facilitator?.id) {
        const avatarUrl = getFacilitatorAvatarUrl(facilitator.id);
        const isValid = await validateImageUrl(avatarUrl);
        
        if (isValid) {
          setValidProfilePicture(avatarUrl);
        } else if (facilitator.profile_picture) {
          setValidProfilePicture(facilitator.profile_picture);
        } else {
          setValidProfilePicture('/placeholder.svg');
        }
      } else if (facilitator?.profile_picture) {
        setValidProfilePicture(facilitator.profile_picture);
      } else {
        setValidProfilePicture('/placeholder.svg');
      }
    };
    
    checkProfilePicture();
  }, [facilitator]);

  return (
    <ChatHeader 
      title={facilitator?.title}
      objective={objective}
      profilePicture={validProfilePicture || '/placeholder.svg'}
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
