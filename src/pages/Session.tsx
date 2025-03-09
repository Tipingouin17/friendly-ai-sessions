
import React from "react";
import { RefactoredSessionProvider } from "@/components/session/RefactoredSessionProvider";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import { useSessionPageState } from "@/hooks/useSessionPageState";
import SessionStateHandler from "@/components/session/SessionStateHandler";
import { SessionContextProps } from "@/types/session";

const Session = () => {
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
