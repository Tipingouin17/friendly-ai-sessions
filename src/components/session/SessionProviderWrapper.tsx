
import React, { useEffect } from "react";
import { RefactoredSessionProvider } from "@/components/session/RefactoredSessionProvider";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import { SessionContextProps } from "@/types/session";
import SessionStateHandler from "@/components/session/SessionStateHandler";

interface SessionProviderWrapperProps {
  onInitialized: () => void;
  onLoading: (isLoading: boolean) => void;
  onError: (error: string) => void;
  handleSessionFull: () => void;
  retryConnection: () => void;
  connectionAttempts: number;
  error: string | null;
  sessionMountedRef: React.RefObject<boolean>;
}

const SessionProviderWrapper: React.FC<SessionProviderWrapperProps> = ({
  onInitialized,
  onLoading,
  onError,
  handleSessionFull,
  retryConnection,
  connectionAttempts,
  error,
  sessionMountedRef
}) => {
  return (
    <RefactoredSessionProvider 
      handleSessionFull={handleSessionFull}
      onError={onError}
    >
      {(props: SessionContextProps) => {
        // Initialize provider when first mounted
        React.useEffect(() => {
          if (sessionMountedRef.current) {
            onInitialized();
          }
        }, []);
        
        // Log provider state
        console.log("SessionProvider props:", {
          isLoading: props.isLoading,
          conversationId: props.currentConversationId,
          messagesCount: props.sessionState?.messages?.length || 0,
          participantsCount: props.participants?.length || 0,
          isSessionStartedInDB: props.isSessionStartedInDB,
          error: props.error,
          hasConversation: !!props.conversation,
          isConnected: props.isConnected || false,
          connectionAttempts: props.connectionAttempts || 0
        });
        
        // Update loading state when it changes
        React.useEffect(() => {
          if (sessionMountedRef.current) {
            onLoading(props.isLoading);
          }
        }, [props.isLoading]);
        
        // Update error state when it changes
        React.useEffect(() => {
          if (props.error && sessionMountedRef.current) {
            onError(props.error);
          }
        }, [props.error]);
        
        // Show loading state if still loading
        if (props.isLoading && !props.conversation) {
          console.log("Showing provider loading state");
          return <JoinSessionLoadingState 
            onRetry={retryConnection}
            retryCount={connectionAttempts} 
          />;
        }
        
        // Show error state if there's an error
        if (props.error) {
          console.log("Showing provider error state:", props.error);
          return <JoinSessionLoadingState 
            error={props.error} 
            onRetry={retryConnection}
            retryCount={connectionAttempts} 
          />;
        }
        
        // Show error if no conversation ID is found
        if (!props.currentConversationId && !props.isLoading) {
          console.error("No conversation ID found in session provider, but no error was returned");
          return <JoinSessionLoadingState 
            error="Session not found. Please try again." 
            onRetry={retryConnection}
            retryCount={connectionAttempts} 
          />;
        }
        
        // Render the session state handler component
        return (
          <SessionStateHandler
            props={props}
            isAdmin={props.isAdmin || false}
            sessionStarted={props.sessionStarted || false}
            setSessionStarted={(started) => console.log("Session started:", started)}
            onSessionFull={handleSessionFull}
          />
        );
      }}
    </RefactoredSessionProvider>
  );
};

export default SessionProviderWrapper;
