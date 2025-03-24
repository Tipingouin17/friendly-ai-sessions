
import React, { useEffect, useState } from 'react';
import ChatHeader from "@/components/chat/ChatHeader";
import { getFacilitatorAvatarUrl, handleAvatarError } from "@/utils/facilitatorUtils";
import { debugLog } from "@/utils/debugLogger";

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
          debugLog('all', `Loading facilitator avatar for: ${JSON.stringify(facilitator)}`);
          
          // Check if we already have a valid profile picture URL
          if (facilitator.profile_picture && facilitator.profile_picture !== '/placeholder.svg') {
            // Don't normalize here - we'll do that in the utility function
            debugLog('all', `Using provided facilitator.profile_picture: ${facilitator.profile_picture}`);
            const avatarUrl = await getFacilitatorAvatarUrl(facilitator);
            setProfilePicture(avatarUrl);
          } else if (facilitator.id) {
            // If we have an ID but no picture, try to get one from the ID
            debugLog('all', `Getting avatar by facilitator ID: ${facilitator.id}`);
            const avatarUrl = await getFacilitatorAvatarUrl(facilitator);
            setProfilePicture(avatarUrl);
          } else {
            // No ID or picture, use placeholder
            debugLog('all', 'No facilitator ID or picture, using placeholder');
            setProfilePicture('/placeholder.svg');
          }
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
      title={facilitator?.title || 'Facilitator'}
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
