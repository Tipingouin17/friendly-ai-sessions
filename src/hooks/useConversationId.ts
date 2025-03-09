
import { useLocation } from "react-router-dom";

export const useConversationId = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const idFromParams = searchParams.get('id');
  
  // Location state type
  const locationState = location.state as { 
    conversationId?: number;
    participantId?: number; 
    isGuest?: boolean; 
    participantName?: string;
    showMessaging?: boolean 
  } | null;
  
  let currentConversationId: number | null = null;

  // First check if ID is in URL params
  if (idFromParams) {
    currentConversationId = parseInt(idFromParams, 10);
  }
  // Then check location state
  else if (locationState?.conversationId) {
    currentConversationId = locationState.conversationId;
  }
  
  return { 
    currentConversationId, 
    locationState 
  };
};
