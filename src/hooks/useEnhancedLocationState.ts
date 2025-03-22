
import { useParticipantPersistence } from "./useParticipantPersistence";
import { LocationStateType } from "./useConversationId";

/**
 * Hook to enhance location state with persisted participant data if available
 */
export function useEnhancedLocationState(
  originalState: any
): LocationStateType | null {
  const { persistedParticipantData } = useParticipantPersistence();

  // Enhanced location state logic extracted from SessionProviderCore
  let locationState = originalState as { 
    participantId?: number; 
    isGuest?: boolean; 
    participantName?: string;
    showMessaging?: boolean;
    isAdmin?: boolean;
  } | null;
  
  // If we have persisted data but no participant ID in location state, use the persisted data
  if (!locationState?.participantId && persistedParticipantData) {
    locationState = {
      ...locationState,
      participantId: persistedParticipantData.participantId,
      isGuest: true,
      participantName: persistedParticipantData.name,
      isAdmin: persistedParticipantData.isAdmin
    };
    console.log("Enhanced provider location state with persisted data:", locationState);
  }
  
  return locationState;
}
