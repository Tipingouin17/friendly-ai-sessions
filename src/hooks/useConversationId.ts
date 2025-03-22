
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
  avatarSeed?: string; // Added this property to fix the type error
}

export const useConversationId = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const idFromParams = searchParams.get('id');
  
  // Location state type
  const locationState = location.state as LocationStateType | null;
  
  // Get persisted participant data
  const { persistedParticipantData, getSessionByConversationId, updateSessionAccessTime } = useParticipantPersistence();
  
  let currentConversationId: number | null = null;
  let persistedSessionData = null;

  // First check if ID is in URL params
  if (idFromParams) {
    console.log("Found conversation ID in URL params:", idFromParams);
    currentConversationId = parseInt(idFromParams, 10);
    
    // Check if we have persisted data for this conversation ID
    persistedSessionData = getSessionByConversationId(currentConversationId);
    
    // Update the last accessed time for this session
    if (persistedSessionData) {
      updateSessionAccessTime(currentConversationId);
      console.log("Found persisted data for conversation ID:", currentConversationId, persistedSessionData);
    }
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
    persistedSessionData = persistedParticipantData;
  }
  
  console.log("useConversationId determined ID:", currentConversationId);
  
  // If we have persisted data, enhance the location state with it
  let enhancedLocationState = locationState;
  if (persistedSessionData && (!locationState?.participantId || !locationState?.participantName)) {
    enhancedLocationState = {
      ...locationState,
      participantId: persistedSessionData.participantId,
      isGuest: true,
      participantName: persistedSessionData.name,
      avatarSeed: persistedSessionData.avatarSeed,
      isAdmin: persistedSessionData.isAdmin
    };
    console.log("Enhanced location state with persisted data:", enhancedLocationState);
  }
  
  return { 
    currentConversationId, 
    locationState: enhancedLocationState,
    persistedSessionData
  };
};
