
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useConversation } from "@/hooks/useConversation";
import { useConversationId } from "@/hooks/useConversationId";
import { useParticipantTracking } from "@/hooks/useParticipantTracking";
import { useSessionInterface } from "@/hooks/useSessionInterface";
import { useSessionStatus } from "@/hooks/useSessionStatus";
import { ConversationWithSession } from "@/types/database";

export const useSessionData = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Extract conversation ID from URL or state
  const { currentConversationId, locationState } = useConversationId();
  
  // Fetch conversation data
  const { data: conversation, isLoading, error, refetch } = useConversation(currentConversationId);
  
  // Set up session status monitoring
  useSessionStatus(currentConversationId, refetch);
  
  // Set up participant tracking
  const { participants, setParticipants } = useParticipantTracking(locationState, conversation as ConversationWithSession);
  
  // Set up session interface (QR code, links, etc.)
  const { sessionLink, showQrCodeView, handleStartSession } = useSessionInterface(currentConversationId);
  
  // Handle errors in conversation query
  useEffect(() => {
    if (error) {
      console.error('Error in conversation query:', error);
      toast({
        title: "Error",
        description: "Failed to load the session. Please try again.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [error, navigate, toast]);

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
  };
};
