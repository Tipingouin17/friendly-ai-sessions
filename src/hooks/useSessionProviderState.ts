
import { useCallback } from "react";
import { useSessionErrorHandler } from "@/hooks/useSessionErrorHandler";
import { useRefactoredSessionData } from "@/hooks/useRefactoredSessionData";
import { useToast } from "@/components/ui/use-toast";

interface UseSessionProviderStateProps {
  onError?: (error: string) => void;
}

export const useSessionProviderState = ({ onError }: UseSessionProviderStateProps) => {
  const { toast } = useToast();
  
  // Set up error handling
  const { providerError, handleError } = useSessionErrorHandler({ onError });
  
  // Load session data
  const {
    currentConversationId,
    conversation,
    isLoading,
    refetch,
    showQrCodeView,
    sessionLink,
    handleStartSession,
    isSessionStarted,
    error: dataError
  } = useRefactoredSessionData();

  // Enhanced handler for starting session with better error handling
  const enhancedHandleStartSession = useCallback(() => {
    try {
      console.log("Enhanced handleStartSession called from session provider");
      handleStartSession();
      toast({
        title: "Starting session",
        description: "The session is now starting...",
      });
      
      // Force refetch after a short delay to ensure we get the latest state
      setTimeout(() => {
        console.log("Forcing refetch after session start");
        refetch();
      }, 1000);
      
    } catch (error) {
      console.error("Error in handleStartSession:", error);
      handleError("Failed to start session. Please try again.");
    }
  }, [handleStartSession, toast, refetch, handleError]);

  return {
    currentConversationId,
    conversation,
    isLoading,
    refetch,
    showQrCodeView,
    sessionLink,
    isSessionStarted,
    dataError,
    providerError,
    handleError,
    enhancedHandleStartSession
  };
};
