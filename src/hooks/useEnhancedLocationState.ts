
import { useEffect } from "react";
import { useParticipantPersistence } from "./useParticipantPersistence";
import { LocationStateType } from "./useConversationId";

/**
 * Hook to enhance location state with persisted participant data if available.
 * Only injects persisted participant identity when the stored conversationId
 * matches the conversation ID in the current URL, to prevent cross-session
 * identity contamination.
 */
export function useEnhancedLocationState(
  originalState: any
): LocationStateType | null {
  useEffect(() => { /* no-op */ }, []);

  const { persistedParticipantData } = useParticipantPersistence();

  // Enhanced location state logic extracted from SessionProviderCore
  let locationState = originalState as { 
    participantId?: number; 
    isGuest?: boolean; 
    participantName?: string;
    showMessaging?: boolean;
    isAdmin?: boolean;
  } | null;
  
  // Only use persisted data if it belongs to the current conversation
  if (!locationState?.participantId && persistedParticipantData) {
    const urlParams = new URLSearchParams(window.location.search);
    const urlConversationId = parseInt(urlParams.get('id') || '0', 10);
    const persistedMatchesCurrent = urlConversationId > 0 &&
      persistedParticipantData.conversationId === urlConversationId;

    if (persistedMatchesCurrent) {
      locationState = {
        ...locationState,
        participantId: persistedParticipantData.participantId,
        isGuest: true,
        participantName: persistedParticipantData.name,
        isAdmin: persistedParticipantData.isAdmin
      };
    }
  }
  
  return locationState;
}
