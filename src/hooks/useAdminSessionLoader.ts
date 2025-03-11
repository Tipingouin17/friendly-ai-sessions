
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { useConversationId } from "@/hooks/useConversationId";
import { useConversation } from "@/hooks/useConversation";

/**
 * Hook to manage admin session loading and initialization
 */
export function useAdminSessionLoader() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitializedProvider, setHasInitializedProvider] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const initializeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { currentConversationId, locationState } = useConversationId();
  const { data: conversationData, isLoading: isConversationLoading } = useConversation(currentConversationId);
  const hasRedirected = useRef(false);
  
  // Check if we're on the admin path and redirect if needed - only once
  useEffect(() => {
    const isAdminPath = location.pathname.includes('/admin');
    
    // Only redirect if not on admin path AND we have not already redirected
    if (!isAdminPath && currentConversationId && !hasRedirected.current) {
      console.log("Not on admin path, redirecting to admin path");
      hasRedirected.current = true;
      navigate(`/session/admin?id=${currentConversationId}`, {
        state: {
          isAdmin: true,
          showMessaging: true,
          conversationId: currentConversationId
        },
        replace: true
      });
    }
  }, [location.pathname, currentConversationId, navigate]);
  
  // Set up initialization and timeout handling
  useEffect(() => {
    console.log("Admin session page mounted", {
      time: new Date().toISOString(),
      isAdmin: true,
      isLoading,
      currentConversationId,
      locationState,
      conversationData: conversationData?.sessions?.title,
      path: location.pathname
    });
    
    const initialTimeout = 3000;
    const criticalTimeout = 5000;
    
    initializeTimeoutRef.current = setTimeout(() => {
      if (isLoading && !hasInitializedProvider) {
        console.warn("Admin session initialization taking longer than expected");
        toast({
          title: "Preparing admin interface",
          description: "Please wait while we set up your admin dashboard.",
        });
      }
    }, initialTimeout);
    
    setTimeout(() => {
      if (isLoading && !hasInitializedProvider) {
        console.error("Critical timeout reached, admin session may be stuck");
        toast({
          title: "Continuing setup",
          description: "Your admin dashboard is almost ready.",
        });
        
        setIsLoading(false);
        setHasInitializedProvider(true);
      }
    }, criticalTimeout);
    
    return () => {
      if (initializeTimeoutRef.current) {
        clearTimeout(initializeTimeoutRef.current);
        initializeTimeoutRef.current = null;
      }
    };
  }, [isLoading, hasInitializedProvider, toast, currentConversationId, locationState, conversationData, location.pathname]);
  
  // Additional redirect check, but only run once to prevent loops
  useEffect(() => {
    if (currentConversationId && !location.pathname.includes('/admin') && !hasRedirected.current) {
      console.log("Should be on admin path but not - redirecting once");
      hasRedirected.current = true;
      navigate(`/session/admin?id=${currentConversationId}`, { 
        state: { 
          isAdmin: true,
          showMessaging: true,
          conversationId: currentConversationId
        },
        replace: true
      });
    }
  }, [currentConversationId, location.pathname, navigate]);
  
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
