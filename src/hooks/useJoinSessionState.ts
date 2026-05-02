/**
 * use Join Session State
 *
 * Hook for the AIfacilitator application.
 */
import { createLogger } from '@/utils/debugLogger';

const log = createLogger('useJoinSessionState', 'session');

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useParticipantPersistence } from './useParticipantPersistence';
import { useJoinSessionNavigation } from './useJoinSessionNavigation';
import { setJoinToken } from '@/lib/api';

// ─── Synchronous join-token bootstrap ────────────────────────────────────────
// Read the join token from the URL *immediately* (before any React render)
// so that the very first API call made by useConversation already carries the
// X-Join-Token header.  The useEffect below keeps the token in sync if the
// URL ever changes, but the critical first-render case is handled here.
(function bootstrapJoinToken() {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const sessionId = params.get('id');
    if (token) {
      // Pass the session ID so the token is stored under the scoped key
      // mf_join_token_{sessionId} rather than the legacy flat key.
      setJoinToken(token, sessionId);
    }
  } catch {
    // Silently ignore — SSR or environments without window
  }
})();

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

  // Extract and store the join token from the URL so that subsequent
  // API requests automatically include it in the X-Join-Token header.
  const joinTokenParam = searchParams.get("token");

  // Keep the token in sync whenever the URL changes (e.g. React Router navigation).
  // The initial value is already set synchronously above before first render.
  useEffect(() => {
    if (joinTokenParam) {
      // Token is present in the URL — use it immediately.
      // Pass the session ID so the token is stored under the scoped key.
      setJoinToken(joinTokenParam, idParam);
    }
    // Do NOT clear the token when it is absent from the URL.  The token will
    // be set from the conversation response by useSessionParticipants as soon
    // as the backend returns the conversation data.  This covers:
    //   • Legacy / plain URLs (?id=X, no token)
    //   • Returning participants whose URL no longer contains the token
    //   • Private/incognito users who lost localStorage
    // Clearing here would race against the conversation fetch and break those
    // flows.  The token is a stable UUID per conversation so there is no
    // security risk in keeping a previously-set token.
    // Do NOT clear on unmount: the token must persist while the participant
    // is in the session.  It will be cleared when they navigate away.
  }, [joinTokenParam]);

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
    } else { /* no-op */ }
  }, [conversationId, idParam, checkNavigationState]);

  return {
    conversationId,
    joinTokenParam,
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
