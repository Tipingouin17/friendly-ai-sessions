import React, { useEffect, useState, useRef, useCallback } from "react";
import { RefactoredSessionProvider } from "@/components/session/RefactoredSessionProvider";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import { useSessionPageState } from "@/hooks/useSessionPageState";
import SessionStateHandler from "@/components/session/SessionStateHandler";
import { SessionContextProps } from "@/types/session";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { isInCrossOriginContext, isInIframe } from "@/utils/crossOriginUtils";
import EmptyState from "@/components/session/EmptyState";
import { useConversationId } from "@/hooks/useConversationId";

const Session = () => {
  const { currentConversationId } = useConversationId();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState<number>(0);
  const [isCrossOrigin, setIsCrossOrigin] = useState<boolean>(false);
  const [noSessionFound, setNoSessionFound] = useState<boolean>(false);
  const [hasInitializedProvider, setHasInitializedProvider] = useState(false);
  const sessionMountedRef = useRef(false);
  const recoveryTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    isAdmin,
    sessionStarted,
    setSessionStarted,
    isLoading,
    setIsLoading,
    error,
    handleSessionFull,
    handleError
  } = useSessionPageState();

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

  useEffect(() => {
    sessionMountedRef.current = true;
    return () => {
      sessionMountedRef.current = false;
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
      }
    };
  }, []);

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

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const sessionId = searchParams.get('id');
    
    if (!sessionId && !location.state && !currentConversationId) {
      console.log("No session ID found in URL or state");
      setNoSessionFound(true);
    }
  }, [location, currentConversationId]);

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

  if (noSessionFound) {
    return <EmptyState />;
  }

  if (error) {
    console.log("Rendering error state:", error);
    return <JoinSessionLoadingState 
      error={error} 
      onRetry={retryConnection}
      retryCount={connectionAttempts} 
    />;
  }

  if (isLoading && !error && !hasInitializedProvider) {
    console.log("Rendering global loading state");
    const loadingTimeElapsed = lastAttemptTime > 0 ? (Date.now() - lastAttemptTime) / 1000 : 0;
    return <JoinSessionLoadingState 
      onRetry={retryConnection}
      retryCount={connectionAttempts}
      loadingTimeElapsed={loadingTimeElapsed} 
    />;
  }

  console.log("Rendering RefactoredSessionProvider");
  return (
    <RefactoredSessionProvider 
      handleSessionFull={handleSessionFull}
      onError={handleError}
    >
      {(props: SessionContextProps) => {
        React.useEffect(() => {
          if (sessionMountedRef.current && !hasInitializedProvider) {
            setHasInitializedProvider(true);
          }
        }, []);
        
        console.log("SessionProvider props:", {
          isLoading: props.isLoading,
          conversationId: props.currentConversationId,
          messagesCount: props.sessionState?.messages?.length || 0,
          participantsCount: props.participants?.length || 0,
          isSessionStartedInDB: props.isSessionStartedInDB,
          error: props.error,
          hasConversation: !!props.conversation,
          isConnected: props.isConnected || false,
          connectionAttempts: props.connectionAttempts || 0,
          isCrossOrigin
        });
        
        React.useEffect(() => {
          if (sessionMountedRef.current) {
            setIsLoading(props.isLoading);
          }
        }, [props.isLoading]);
        
        React.useEffect(() => {
          if (props.error && sessionMountedRef.current) {
            handleError(props.error);
          }
        }, [props.error]);
        
        if (props.isLoading && !props.conversation) {
          console.log("Showing provider loading state");
          return <JoinSessionLoadingState 
            onRetry={retryConnection}
            retryCount={connectionAttempts} 
          />;
        }
        
        if (props.error) {
          console.log("Showing provider error state:", props.error);
          return <JoinSessionLoadingState 
            error={props.error} 
            onRetry={retryConnection}
            retryCount={connectionAttempts} 
          />;
        }
        
        if (!props.currentConversationId && !props.isLoading) {
          console.error("No conversation ID found in session provider, but no error was returned");
          return <JoinSessionLoadingState 
            error="Session not found. Please try again." 
            onRetry={retryConnection}
            retryCount={connectionAttempts} 
          />;
        }
        
        console.log("Rendering SessionStateHandler");
        return (
          <SessionStateHandler
            props={props}
            isAdmin={isAdmin}
            sessionStarted={sessionStarted}
            setSessionStarted={setSessionStarted}
            onSessionFull={handleSessionFull}
          />
        );
      }}
    </RefactoredSessionProvider>
  );
};

export default Session;
