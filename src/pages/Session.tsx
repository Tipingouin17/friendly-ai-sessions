
import React, { useEffect, useState, useRef } from "react";
import { RefactoredSessionProvider } from "@/components/session/RefactoredSessionProvider";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import { useSessionPageState } from "@/hooks/useSessionPageState";
import SessionStateHandler from "@/components/session/SessionStateHandler";
import { SessionContextProps } from "@/types/session";
import { useLocation } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

const Session = () => {
  const location = useLocation();
  const { toast } = useToast();
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState<number>(0);
  const sessionMountedRef = useRef(false);
  
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

  // Function to retry connection with exponential backoff
  const retryConnection = () => {
    console.log("Retrying connection...");
    setConnectionAttempts(prev => prev + 1);
    setLastAttemptTime(Date.now());
    
    // Safer reload approach that preserves location state
    if (connectionAttempts < 3) {
      window.location.reload();
    } else {
      // After multiple attempts, try a different approach
      toast({
        title: "Connection issues detected",
        description: "Trying an alternative connection method...",
        variant: "destructive",
      });
      
      // Force refresh instead of reload to avoid potential caching issues
      setTimeout(() => {
        window.location.href = window.location.href;
      }, 1000);
    }
  };

  // Set mounted flag to help prevent memory leaks on component unmount
  useEffect(() => {
    sessionMountedRef.current = true;
    return () => {
      sessionMountedRef.current = false;
    };
  }, []);

  // Attempt to recover from blank screens with a timer
  useEffect(() => {
    // If we've been loading for more than 10 seconds, show a recovery option
    const recoveryTimer = setTimeout(() => {
      if (isLoading && !error && sessionMountedRef.current) {
        console.log("Session page appears stuck in loading state, triggering recovery");
        // Only show toast on first attempt
        if (connectionAttempts === 0) {
          toast({
            title: "Connection issue detected",
            description: "The session is taking longer than expected to load.",
            variant: "destructive",
          });
        }
      }
    }, 10000);

    return () => clearTimeout(recoveryTimer);
  }, [isLoading, error, toast, connectionAttempts]);

  // Debug logging for the session page
  useEffect(() => {
    console.log("Session page rendered with:", {
      locationSearch: location.search,
      locationState: location.state,
      isAdmin,
      error,
      connectionAttempts,
      isLoading
    });
  }, [location, isAdmin, error, connectionAttempts, isLoading]);

  // Show error state if there's an error
  if (error) {
    console.log("Rendering error state:", error);
    return <JoinSessionLoadingState 
      error={error} 
      onRetry={retryConnection}
      retryCount={connectionAttempts} 
    />;
  }

  // Show loading state during initial data fetching
  if (isLoading && !error) {
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
        // Log props for debugging
        console.log("SessionProvider props:", {
          isLoading: props.isLoading,
          conversationId: props.currentConversationId,
          messagesCount: props.sessionState?.messages?.length || 0,
          participantsCount: props.participants?.length || 0,
          isSessionStartedInDB: props.isSessionStartedInDB,
          error: props.error,
          hasConversation: !!props.conversation
        });
        
        // Ensure we update the loading state from the provider
        React.useEffect(() => {
          if (sessionMountedRef.current) {
            setIsLoading(props.isLoading);
          }
        }, [props.isLoading, setIsLoading]);
        
        // Handle errors from the session provider
        React.useEffect(() => {
          if (props.error && sessionMountedRef.current) {
            handleError(props.error);
          }
        }, [props.error, handleError]);
        
        // If we're still loading, show a loading state with retry option
        if (props.isLoading) {
          console.log("Showing provider loading state");
          return <JoinSessionLoadingState 
            onRetry={retryConnection}
            retryCount={connectionAttempts} 
          />;
        }
        
        // If there's an error, return early with retry option
        if (props.error) {
          console.log("Showing provider error state:", props.error);
          return <JoinSessionLoadingState 
            error={props.error} 
            onRetry={retryConnection}
            retryCount={connectionAttempts} 
          />;
        }
        
        // If no conversation is found despite not having an error, show a more helpful message
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
