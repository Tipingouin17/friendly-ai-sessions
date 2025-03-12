
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useLocation } from "react-router-dom";
import { useConversationId } from "@/hooks/useConversationId";
import { useConversation } from "@/hooks/useConversation";

export function useAdminSessionLoader() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitializedProvider, setHasInitializedProvider] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const initializeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { currentConversationId, locationState } = useConversationId();
  const { data: conversationData, isLoading: isConversationLoading } = useConversation(currentConversationId);
  
  // Set up initialization and timeout handling
  useEffect(() => {
    const initialTimeout = 2000; // Shorter timeout for admin
    const criticalTimeout = 3000;
    
    initializeTimeoutRef.current = setTimeout(() => {
      if (isLoading && !hasInitializedProvider) {
        console.log("Admin: Still initializing after initial timeout");
        setIsLoading(false);
        setHasInitializedProvider(true);
      }
    }, initialTimeout);
    
    setTimeout(() => {
      if (isLoading && !hasInitializedProvider) {
        console.log("Admin: Critical timeout reached");
        setIsLoading(false);
        setHasInitializedProvider(true);
      }
    }, criticalTimeout);
    
    return () => {
      if (initializeTimeoutRef.current) {
        clearTimeout(initializeTimeoutRef.current);
      }
    };
  }, [isLoading, hasInitializedProvider]);
  
  return {
    isLoading,
    setIsLoading,
    hasInitializedProvider,
    setHasInitializedProvider,
    conversationData,
    isConversationLoading,
    currentConversationId,
    locationState
  };
}
