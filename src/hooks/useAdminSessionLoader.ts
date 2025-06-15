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
  const adminViewMountedRef = useRef<boolean>(false);
  
  // Set admin view as mounted to prevent unmounting
  useEffect(() => {
    console.log("Admin session loader - admin view mounted");
    
    // Set admin view as mounted to prevent unmounting
    adminViewMountedRef.current = true;
    
    return () => {
      // Reset mounted state on unmount
      adminViewMountedRef.current = false;
    };
  }, []);
  
  // Cache conversation data to prevent it from disappearing
  // Improved caching - keep the data even if the API returns null/undefined
  useEffect(() => {
    if (conversationData) {
      console.log("Caching admin session data for persistence");
      cachedDataRef.current = conversationData;
    }
  }, [conversationData]);
  
  // Set up initialization and timeout handling - use shorter timeout for admin
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
  
  // Force-initialize after a critical timeout even without data
  useEffect(() => {
    const criticalTimeout = setTimeout(() => {
      if (!wasInitializedRef.current) {
        console.log("Admin: Critical timeout reached - forcing initialization");
        setIsLoading(false);
        setHasInitializedProvider(true);
        wasInitializedRef.current = true;
        
        toast({
          title: "Admin Session Ready",
          description: "Admin interface loaded in safe mode."
        });
      }
    }, 2500); // Very short critical timeout for admin
    
    return () => clearTimeout(criticalTimeout);
  }, [toast]);
  
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
    locationState,
    adminViewMounted: adminViewMountedRef.current
  };
}
