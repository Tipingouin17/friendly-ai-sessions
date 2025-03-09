
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
      isAdmin: isAdmin,
      error: error
    });
  }, [location, isAdmin, error]);

  if (error) {
    return <JoinSessionLoadingState error={error} onRetry={() => window.location.reload()} />;
  }

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
          error: props.error
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
        
        // If there's an error, return early
        if (props.error) {
          return <JoinSessionLoadingState error={props.error} onRetry={() => window.location.reload()} />;
        }
        
        // If no conversation is found despite not having an error, show a more helpful message
        if (!props.currentConversationId && !props.isLoading) {
          console.error("No conversation ID found in session provider, but no error was returned");
        }
        
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
