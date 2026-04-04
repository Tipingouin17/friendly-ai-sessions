/**
 * Session Header
 *
 * Session component for the AIfacilitator application.
 */

import React, { useEffect, useState } from 'react';
import ChatHeader from "@/components/chat/ChatHeader";
import { getFacilitatorAvatarUrl, handleAvatarError } from "@/utils/facilitatorUtils";
import { debugLog } from "@/utils/debugLogger";
import { isInCrossOriginContext } from "@/utils/crossOriginUtils";
import { SessionTimerState } from "@/hooks/useSessionTimer";

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
  timer?: SessionTimerState | null;
}

const SessionHeader = ({
  facilitator,
  objective,
  participantCount,
  onGenerateReport,
  isGeneratingReport,
  canGenerateReports,
  messagesCount,
  viewMode,
  timer = null,
}: SessionHeaderProps) => {
  const [profilePicture, setProfilePicture] = useState<string>('/placeholder.svg');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    let isMounted = true;
    const loadProfilePicture = async () => {
      setIsLoading(true);
      try {
        if (facilitator) {
          debugLog('all', `SessionHeader - Loading facilitator avatar for: ${JSON.stringify(facilitator)}`);
          
          // Check if we already have a valid profile picture URL and avoid double normalization
          if (facilitator.profile_picture && 
              facilitator.profile_picture !== '/placeholder.svg') {
            
            // Check if the URL has already been normalized (contains crossorigin marker)
            if (facilitator.profile_picture.includes('crossorigin=anonymous')) {
              if (isMounted) {
                setProfilePicture(facilitator.profile_picture);
                setIsLoading(false);
              }
              debugLog('all', `SessionHeader - Using already normalized profile picture: ${facilitator.profile_picture}`);
              return;
            }
            
            // Use the utility function to get a normalized URL
            const avatarUrl = await getFacilitatorAvatarUrl(facilitator);
            if (isMounted) {
              setProfilePicture(avatarUrl);
              setIsLoading(false);
            }
            debugLog('all', `SessionHeader - Using normalized facilitator.profile_picture: ${avatarUrl}`);
          } else if (facilitator.id) {
            // If we have an ID but no picture, try to get one from the ID
            debugLog('all', `SessionHeader - Getting avatar by facilitator ID: ${facilitator.id}`);
            const avatarUrl = await getFacilitatorAvatarUrl(facilitator);
            if (isMounted) {
              setProfilePicture(avatarUrl);
              setIsLoading(false);
            }
          } else {
            // No ID or picture, use placeholder
            debugLog('all', 'SessionHeader - No facilitator ID or picture, using placeholder');
            if (isMounted) {
              setProfilePicture('/placeholder.svg');
              setIsLoading(false);
            }
          }
        } else {
          if (isMounted) {
            setProfilePicture('/placeholder.svg');
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Error loading facilitator avatar in SessionHeader:', error);
        if (isMounted) {
          setProfilePicture('/placeholder.svg');
          setIsLoading(false);
        }
      }
    };
    
    loadProfilePicture();
    
    return () => { isMounted = false; };
  }, [facilitator]);

  // Only set crossOrigin="anonymous" when embedded in a cross-origin iframe.
  // Omitting it for normal page loads avoids an unnecessary CORS preflight.
  const needsCrossOrigin = isInCrossOriginContext();

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
      needsCrossOrigin={needsCrossOrigin}
      timer={timer}
    />
  );
};

export default SessionHeader;
