
import { useNavigate } from "react-router-dom";
import { useSessionDataFetching } from "@/hooks/useSessionDataFetching";
import { useConversationId } from "@/hooks/useConversationId";
import { useParticipantTracking } from "@/hooks/useParticipantTracking";
import { useSessionStatus } from "@/hooks/useSessionStatus";
import { useSessionInterface } from "@/hooks/useSessionInterface";
import { useSessionErrorHandling } from "@/hooks/useSessionErrorHandling";
import { ConversationWithSession } from "@/types/database";

export const useRefactoredSessionData = () => {
  const navigate = useNavigate();
  
  // Extract conversation ID from URL or state
  const { currentConversationId, locationState } = useConversationId();
  
  // Fetch conversation data with error handling
  const { 
    conversation, 
    isLoading, 
    errorMessage, 
    refetch 
  } = useSessionDataFetching({
    conversationId: currentConversationId,
    onError: (error) => console.error("Session data error:", error)
  });
  
  // Set up session status monitoring
  useSessionStatus(currentConversationId, refetch);
  
  // Set up participant tracking
  const { participants, setParticipants } = useParticipantTracking(
    locationState, 
    conversation as ConversationWithSession
  );
  
  // Set up session interface (QR code, links, etc.)
  const { 
    sessionLink, 
    showQrCodeView, 
    isSessionStarted, 
    handleStartSession 
  } = useSessionInterface(currentConversationId);

  return {
    currentConversationId,
    participants,
    setParticipants,
    sessionLink,
    showQrCodeView,
    conversation,
    isLoading,
    refetch,
    handleStartSession,
    isSessionStarted,
    error: errorMessage
  };
};
