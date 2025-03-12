
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
  const wasInitializedRef = useRef<boolean>(false);
  
  // Always store admin status in session storage
  useEffect(() => {
    sessionStorage.setItem('isAdminSession', 'true');
  }, []);
  
  // Cache conversation data to prevent it from disappearing
  useEffect(() => {
    if (conversationData) {
      console.log("Caching admin session data for persistence");
      cachedDataRef.current = conversationData;
    }
  }, [conversationData]);
  
  // Set up initialization and timeout handling
  useEffect(() => {
    if (wasInitializedRef.current) return;
    
    const initialTimeout = 1000; // Shorter timeout for admin
    
    initializeTimeoutRef.current = setTimeout(() => {
      if (isLoading && !hasInitializedProvider) {
        console.log("Admin: Completing initialization");
        setIsLoading(false);
        setHasInitializedProvider(true);
        wasInitializedRef.current = true;
      }
    }, initialTimeout);
    
    return () => {
      if (initializeTimeoutRef.current) {
        clearTimeout(initializeTimeoutRef.current);
      }
    };
  }, [isLoading, hasInitializedProvider]);
  
  // Use cached data if current data is missing
  const effectiveData = conversationData || cachedDataRef.current;
  
  return {
    isLoading: isLoading && !wasInitializedRef.current,
    setIsLoading,
    hasInitializedProvider: hasInitializedProvider || wasInitializedRef.current,
    setHasInitializedProvider,
    conversationData: effectiveData,
    isConversationLoading: isConversationLoading && !effectiveData,
    currentConversationId,
    locationState
  };
}
