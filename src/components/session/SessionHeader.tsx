
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
          
          // Use profile_picture directly if provided and it's a complete URL or path
          if (facilitator.profile_picture) {
            const profilePic = facilitator.profile_picture;
            
            // Ensure it has a proper path format
            if (profilePic.startsWith('http') || profilePic.startsWith('/')) {
              console.log('SessionHeader: Using direct profile picture URL:', profilePic);
              setProfilePicture(profilePic);
            } else {
              // Add leading slash if missing
              const fixedPath = `/${profilePic}`;
              console.log('SessionHeader: Fixed profile picture path:', fixedPath);
              setProfilePicture(fixedPath);
            }
          } else {
            // Fallback to generated avatar URL
            const avatarUrl = await getFacilitatorAvatarUrl(facilitator);
            console.log('SessionHeader: Generated avatar URL:', avatarUrl);
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
