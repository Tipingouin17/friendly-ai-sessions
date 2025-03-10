
import React from 'react';
import { SessionContextProps } from "@/types/session";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import SessionStateHandler from "@/components/session/SessionStateHandler";

interface SessionStateRendererProps {
  props: SessionContextProps;
  isLoading: boolean;
  error: string | null;
  effectiveAdmin: boolean;
  retryConnection: () => void;
  connectionAttempts: number;
  sessionStarted: boolean;
  setSessionStarted: (started: boolean) => void;
  handleSessionFull: () => void;
}

const SessionStateRenderer: React.FC<SessionStateRendererProps> = ({
  props,
  isLoading,
  error,
  effectiveAdmin,
  retryConnection,
  connectionAttempts,
  sessionStarted,
  setSessionStarted,
  handleSessionFull
}) => {
  if (props.isLoading && !props.conversation && !(effectiveAdmin && props.isAdmin)) {
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
  
  if (!props.currentConversationId && !props.isLoading && !effectiveAdmin) {
    console.error("No conversation ID found in session provider, but no error was returned");
    return <JoinSessionLoadingState 
      error="Session not found. Please try again." 
      onRetry={retryConnection}
      retryCount={connectionAttempts} 
    />;
  }
  
  return (
    <SessionStateHandler
      props={{
        ...props,
        isAdmin: props.isAdmin || effectiveAdmin
      }}
      isAdmin={props.isAdmin || effectiveAdmin}
      sessionStarted={sessionStarted}
      setSessionStarted={setSessionStarted}
      onSessionFull={handleSessionFull}
    />
  );
};

export default SessionStateRenderer;
