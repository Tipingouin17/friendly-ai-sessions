
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
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadProfilePicture = async () => {
      setIsLoading(true);
      try {
        if (facilitator) {
          // Use the simplified avatar URL resolution
          const avatarUrl = await getFacilitatorAvatarUrl(facilitator);
          setProfilePicture(avatarUrl);
        } else {
          setProfilePicture('/placeholder.svg');
        }
      } catch (error) {
        console.error('Error loading facilitator avatar:', error);
        setProfilePicture('/placeholder.svg');
      } finally {
        setIsLoading(false);
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
      isLoading={isLoading}
    />
  );
};

export default SessionHeader;
