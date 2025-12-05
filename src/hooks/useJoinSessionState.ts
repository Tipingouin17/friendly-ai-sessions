import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useParticipantPersistence } from './useParticipantPersistence';
import { useJoinSessionNavigation } from './useJoinSessionNavigation';

export const useJoinSessionState = () => {
  const [searchParams] = useSearchParams();
  const [invalidRequest, setInvalidRequest] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { checkNavigationState } = useJoinSessionNavigation();

  // Participant persistence hooks
  const { getSessionByConversationId } = useParticipantPersistence();

  // Safely parse the conversation ID from URL
  const idParam = searchParams.get("id");
  const conversationId = idParam && !isNaN(Number(idParam)) ? Number(idParam) : null;

  // Memoize existingSessionData to prevent infinite re-renders
  const existingSessionData = useMemo(() => {
    if (checkNavigationState()) return null;
    return conversationId ? getSessionByConversationId(conversationId) : null;
  }, [conversationId, getSessionByConversationId, checkNavigationState]);

  // Guard variable to detect if user has already joined
  const hasJoinedBefore = !!existingSessionData?.participantId;

  // Use function initialization to avoid re-renders
  const [showRejoinPrompt, setShowRejoinPrompt] = useState(() => {
    if (checkNavigationState()) return false;
    return !!existingSessionData;
  });

  // Prepare default values for the hook
  const defaultParticipantName = existingSessionData?.name || "";
  const defaultAvatarSeed = existingSessionData?.avatarSeed || Math.random().toString();

  // Validate that we have a valid conversation ID
  useEffect(() => {
    if (checkNavigationState()) return;

    if (!conversationId) {
      console.error("No valid conversation ID found in URL parameters:", idParam);
      setInvalidRequest(true);
    } else {
      console.log("JoinSession: Using conversation ID:", conversationId);
    }
  }, [conversationId, idParam, checkNavigationState]);

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
