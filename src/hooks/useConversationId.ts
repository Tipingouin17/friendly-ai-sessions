
import { useLocation } from "react-router-dom";
import { useParticipantPersistence } from "./useParticipantPersistence";

export interface LocationStateType {
  conversationId?: number;
  participantId?: number; 
  isGuest?: boolean; 
  participantName?: string;
  showMessaging?: boolean;
  isAdmin?: boolean;
  newConversationId?: number; // Add support for this field that might be passed
}

export const useConversationId = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const idFromParams = searchParams.get('id');
  
  // Location state type
  const locationState = location.state as LocationStateType | null;
  
  // Get persisted participant data
  const { persistedParticipantData } = useParticipantPersistence();
  
  let currentConversationId: number | null = null;

  // First check if ID is in URL params
  if (idFromParams) {
    console.log("Found conversation ID in URL params:", idFromParams);
    currentConversationId = parseInt(idFromParams, 10);
  }
  // Then check location state.conversationId
  else if (locationState?.conversationId) {
    console.log("Found conversation ID in state.conversationId:", locationState.conversationId);
    currentConversationId = locationState.conversationId;
  }
  // Also check location state.newConversationId which might be used
  else if (locationState?.newConversationId) {
    console.log("Found conversation ID in state.newConversationId:", locationState.newConversationId);
    currentConversationId = locationState.newConversationId;
  }
  // Finally, check persisted data
  else if (persistedParticipantData?.conversationId) {
    console.log("Found conversation ID in persisted data:", persistedParticipantData.conversationId);
    currentConversationId = persistedParticipantData.conversationId;
  }
  
  console.log("useConversationId determined ID:", currentConversationId);
  
  // If we have persisted data, enhance the location state with it
  let enhancedLocationState = locationState;
  if (!locationState?.participantId && persistedParticipantData) {
    enhancedLocationState = {
      ...locationState,
      participantId: persistedParticipantData.participantId,
      isGuest: true,
      participantName: persistedParticipantData.name,
      isAdmin: persistedParticipantData.isAdmin
    };
    console.log("Enhanced location state with persisted data:", enhancedLocationState);
  }
  
  return { 
    currentConversationId, 
    locationState: enhancedLocationState
  };
};
