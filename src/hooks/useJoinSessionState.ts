
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useParticipantPersistence } from './useParticipantPersistence';

export const useJoinSessionState = (checkNavigationState: () => boolean) => {
  const [searchParams] = useSearchParams();
  const [invalidRequest, setInvalidRequest] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Participant persistence hooks
  const { getSessionByConversationId } = useParticipantPersistence();
  
  // Safely parse the conversation ID from URL
  const idParam = searchParams.get("id");
  const conversationId = idParam && !isNaN(Number(idParam)) ? Number(idParam) : null;
  
  // Memoize existingSessionData to prevent infinite re-renders
  const existingSessionData = useMemo(() => {
    // Only calculate if navigation is not in progress
    if (checkNavigationState()) return null;
    return conversationId ? getSessionByConversationId(conversationId) : null;
  }, [conversationId, getSessionByConversationId, retryCount]); // Remove checkNavigationState from deps
  
  // Guard variable to detect if user has already joined
  const hasJoinedBefore = !!existingSessionData?.participantId;
  
  // Use function initialization to avoid re-renders
  const [showRejoinPrompt, setShowRejoinPrompt] = useState(() => {
    // Only show rejoin prompt if we have existing data and navigation is not in progress
    return !!existingSessionData && !checkNavigationState();
  });
  
  // Prepare default values for the hook
  const defaultParticipantName = existingSessionData?.name || "";
  const defaultAvatarSeed = existingSessionData?.avatarSeed || Math.random().toString();

  // Validate that we have a valid conversation ID
  useEffect(() => {
    // Skip validation if navigation is in progress
    if (checkNavigationState()) return;
    
    if (!conversationId) {
      console.error("No valid conversation ID found in URL parameters:", idParam);
      setInvalidRequest(true);
    } else {
      console.log("JoinSession: Using conversation ID:", conversationId);
      setInvalidRequest(false);
    }
  }, [conversationId, idParam, retryCount]); // Remove checkNavigationState from deps
  
  return {
    conversationId,
    invalidRequest,
    setInvalidRequest,
    retryCount,
    setRetryCount,
    existingSessionData,
    hasJoinedBefore,
    showRejoinPrompt,
    setShowRejoinPrompt,
    defaultParticipantName,
    defaultAvatarSeed
  };
};
