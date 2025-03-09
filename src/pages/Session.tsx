
import React, { useEffect } from "react";
import { RefactoredSessionProvider } from "@/components/session/RefactoredSessionProvider";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import { useSessionPageState } from "@/hooks/useSessionPageState";
import SessionStateHandler from "@/components/session/SessionStateHandler";
import { SessionContextProps } from "@/types/session";
import { useLocation } from "react-router-dom";

const Session = () => {
  const location = useLocation();
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

  // Debug logging for the session page
  useEffect(() => {
    console.log("Session page rendered with:", {
      locationSearch: location.search,
      locationState: location.state,
      isAdmin,
      error
    });
  }, [location, isAdmin, error]);

  // Show error state if there's an error
  if (error) {
    console.log("Rendering error state:", error);
    return <JoinSessionLoadingState error={error} onRetry={() => window.location.reload()} />;
  }

  // Show loading state during initial data fetching
  if (isLoading && !error) {
    console.log("Rendering global loading state");
    return <JoinSessionLoadingState />;
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
          messagesCount: props.sessionState.messages.length,
          participantsCount: props.participants.length,
          isSessionStartedInDB: props.isSessionStartedInDB,
          error: props.error,
          hasConversation: !!props.conversation
        });
        
        // Ensure we update the loading state from the provider
        React.useEffect(() => {
          setIsLoading(props.isLoading);
        }, [props.isLoading, setIsLoading]);
        
        // Handle errors from the session provider
        React.useEffect(() => {
          if (props.error) {
            handleError(props.error);
          }
        }, [props.error, handleError]);
        
        // If we're still loading, show a loading state
        if (props.isLoading) {
          console.log("Showing provider loading state");
          return <JoinSessionLoadingState />;
        }
        
        // If there's an error, return early
        if (props.error) {
          console.log("Showing provider error state:", props.error);
          return <JoinSessionLoadingState error={props.error} onRetry={() => window.location.reload()} />;
        }
        
        // If no conversation is found despite not having an error, show a more helpful message
        if (!props.currentConversationId && !props.isLoading) {
          console.error("No conversation ID found in session provider, but no error was returned");
          return <JoinSessionLoadingState error="Session not found. Please try again." onRetry={() => window.location.reload()} />;
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
