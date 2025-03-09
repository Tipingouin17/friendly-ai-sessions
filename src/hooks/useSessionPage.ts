
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useConversationId } from "@/hooks/useConversationId";
import { isInCrossOriginContext, isInIframe } from "@/utils/crossOriginUtils";

export function useSessionPage() {
  const { currentConversationId } = useConversationId();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State variables
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState<number>(0);
  const [isCrossOrigin, setIsCrossOrigin] = useState<boolean>(false);
  const [noSessionFound, setNoSessionFound] = useState<boolean>(false);
  const [hasInitializedProvider, setHasInitializedProvider] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const sessionMountedRef = useRef(false);
  const recoveryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check for cross-origin context
  useEffect(() => {
    const crossOriginContext = isInCrossOriginContext();
    const inIframe = isInIframe();
    setIsCrossOrigin(crossOriginContext);
    
    console.log("Session environment:", {
      isInCrossOriginContext: crossOriginContext,
      isInIframe: inIframe,
      locationSearch: location.search,
      conversationId: currentConversationId
    });

    if (crossOriginContext) {
      toast({
        title: "Cross-Origin Session",
        description: "You're accessing this session from another site. This may affect some functionality.",
      });
    }
  }, [location.search, toast, currentConversationId]);

  // Determine if user is admin
  useEffect(() => {
    const locationState = location.state as { 
      isGuest?: boolean; 
      showMessaging?: boolean;
      isAdmin?: boolean;
    } | null;
    
    // User is considered admin if:
    // 1. They're explicitly marked as admin in the state
    // 2. They're not a guest (implying they created the session)
    // 3. They're not accessing via the join flow
    const adminStatus = Boolean(locationState?.isAdmin) || 
      (locationState?.isGuest !== true);
    
    setIsAdmin(adminStatus);
    console.log("Session page - isAdmin determined as:", adminStatus, "from state:", locationState);
  }, [location]);

  // Check if session ID exists
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const sessionId = searchParams.get('id');
    
    if (!sessionId && !location.state && !currentConversationId) {
      console.log("No session ID found in URL or state");
      setNoSessionFound(true);
    }
  }, [location, currentConversationId]);

  // Set up component lifecycle and recovery timer
  useEffect(() => {
    sessionMountedRef.current = true;
    return () => {
      sessionMountedRef.current = false;
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
      }
    };
  }, []);

  // Set up recovery timer for stuck loading state
  useEffect(() => {
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
    }
    
    recoveryTimerRef.current = setTimeout(() => {
      if (isLoading && !error && sessionMountedRef.current && !hasInitializedProvider) {
        console.log("Session page appears stuck in loading state, triggering recovery");
        if (connectionAttempts === 0) {
          toast({
            title: "Connection issue detected",
            description: "The session is taking longer than expected to load.",
            variant: "destructive",
          });
        }
      }
    }, 10000);

    return () => {
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
      }
    };
  }, [isLoading, error, toast, connectionAttempts, hasInitializedProvider]);

  // Retry connection function
  const retryConnection = useCallback(() => {
    if (!sessionMountedRef.current) return;
    
    console.log("Retrying connection...");
    setConnectionAttempts(prev => prev + 1);
    setLastAttemptTime(Date.now());
    
    if (connectionAttempts < 3) {
      if (isCrossOrigin) {
        const searchParams = new URLSearchParams(location.search);
        const sessionId = searchParams.get('id') || currentConversationId?.toString();
        
        if (sessionId) {
          toast({
            title: "Reestablishing connection",
            description: "Trying an alternative connection method for cross-origin context...",
          });
          
          window.location.href = `${window.location.origin}/session?id=${sessionId}`;
        } else {
          window.location.reload();
        }
      } else {
        window.location.reload();
      }
    } else {
      toast({
        title: "Connection issues detected",
        description: "Trying an alternative connection method...",
        variant: "destructive",
      });
      
      setTimeout(() => {
        window.location.href = window.location.href;
      }, 1000);
    }
  }, [connectionAttempts, isCrossOrigin, location.search, toast, currentConversationId]);

  // Handle error state
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    console.error("Session error:", errorMessage);
    
    toast({
      title: "Session Error",
      description: errorMessage,
      variant: "destructive",
    });
  }, [toast]);

  // Handle session full state
  const handleSessionFull = useCallback(() => {
    // Auto-start session when it's full
    setSessionStarted(true);
    
    toast({
      title: "Session is full",
      description: "The maximum number of participants has joined. Starting session automatically.",
    });
  }, [toast]);

  // Debug logging
  useEffect(() => {
    console.log("Session page rendered with:", {
      locationSearch: location.search,
      locationState: location.state,
      currentConversationId,
      isAdmin,
      error,
      connectionAttempts,
      isLoading,
      isCrossOrigin,
      hasInitializedProvider
    });
  }, [location, isAdmin, error, connectionAttempts, isLoading, isCrossOrigin, currentConversationId, hasInitializedProvider]);

  return {
    currentConversationId,
    isAdmin,
    sessionStarted,
    setSessionStarted,
    isLoading,
    setIsLoading,
    error,
    noSessionFound,
    connectionAttempts,
    lastAttemptTime,
    hasInitializedProvider,
    setHasInitializedProvider,
    isCrossOrigin,
    sessionMountedRef,
    handleError,
    handleSessionFull,
    retryConnection
  };
}
