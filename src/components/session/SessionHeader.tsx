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
          console.log('SessionHeader: Loading profile picture for facilitator:', facilitator);
          // Use profile_picture directly if it's a full URL (not an API avatar URL)
          if (facilitator.profile_picture && 
              !facilitator.profile_picture.startsWith('/api/avatar') && 
              !facilitator.profile_picture.includes('api.qrserver.com') &&
              facilitator.profile_picture !== '/placeholder.svg') {
            console.log('SessionHeader: Using direct profile picture URL:', facilitator.profile_picture);
            setProfilePicture(facilitator.profile_picture);
          } else {
            // Otherwise, try to get a better avatar URL
            const avatarUrl = await getFacilitatorAvatarUrl(facilitator);
            console.log('SessionHeader: Avatar URL resolved to:', avatarUrl);
            setProfilePicture(avatarUrl);
          }
        } else {
          console.log('SessionHeader: No facilitator data provided');
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
