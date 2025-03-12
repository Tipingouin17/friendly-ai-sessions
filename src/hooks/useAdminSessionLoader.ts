
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
  const cachedDataRef = useRef<any>(null);
  
  // Cache conversation data to prevent it from disappearing
  useEffect(() => {
    if (conversationData && !cachedDataRef.current) {
      console.log("Caching admin session data for persistence");
      cachedDataRef.current = conversationData;
    }
  }, [conversationData]);
  
  // Set up initialization and timeout handling
  useEffect(() => {
    const initialTimeout = 1500; // Shorter timeout for admin
    const criticalTimeout = 2500;
    
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
  
  // Use cached data if current data is missing
  const effectiveData = conversationData || cachedDataRef.current;
  
  return {
    isLoading,
    setIsLoading,
    hasInitializedProvider,
    setHasInitializedProvider,
    conversationData: effectiveData,
    isConversationLoading: isConversationLoading && !effectiveData,
    currentConversationId,
    locationState
  };
}
