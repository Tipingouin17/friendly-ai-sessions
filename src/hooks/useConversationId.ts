
import { useLocation } from "react-router-dom";

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
  
  console.log("useConversationId determined ID:", currentConversationId);
  
  return { 
    currentConversationId, 
    locationState 
  };
};
