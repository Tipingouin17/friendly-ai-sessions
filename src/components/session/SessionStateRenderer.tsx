
import React, { useEffect } from 'react';
import { SessionContextProps } from "@/types/session";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import SessionStateHandler from "@/components/session/SessionStateHandler";
import { useToast } from "@/components/ui/use-toast";

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
  const { toast } = useToast();
  
  // Debug logging
  useEffect(() => {
    console.log("SessionStateRenderer state:", {
      isLoading,
      hasError: !!error || !!props.error,
      errorMessage: error || props.error,
      effectiveAdmin,
      propsAdmin: props.isAdmin,
      connectionAttempts,
      hasConversation: !!props.conversation,
      hasConversationId: !!props.currentConversationId,
      isSessionStarted: props.isSessionStartedInDB,
      sessionStarted
    });
  }, [props, isLoading, error, effectiveAdmin, connectionAttempts, sessionStarted]);
  
  // If admin status detected but not reflected in props, update the UI
  useEffect(() => {
    if (effectiveAdmin && !props.isAdmin) {
      console.log("Admin status detected but not reflected in props. Forcing admin override in SessionStateRenderer");
    }
  }, [effectiveAdmin, props.isAdmin]);

  // Special handling for admin users with session full errors
  const isSessionFullError = error?.includes("full") || error?.includes("maximum capacity") || 
                           props.error?.includes("full") || props.error?.includes("maximum capacity");
  
  if (effectiveAdmin && isSessionFullError) {
    console.log("🔑 Admin detected with session full error - bypassing error screen");
    
    if (!props.conversation) {
      console.log("Admin bypass: No conversation data found, attempting to force refresh data");
      props.refetch();
    }
    
    // For admin users, we'll bypass the error state and show the session
    return (
      <SessionStateHandler
        props={{
          ...props,
          isAdmin: true, // Force admin status
          error: null // Clear the error for admin
        }}
        isAdmin={true}
        sessionStarted={sessionStarted}
        setSessionStarted={setSessionStarted}
        onSessionFull={handleSessionFull}
      />
    );
  }
  
  // If loading and no conversation, show loading state
  if (isLoading && !props.conversation && !(effectiveAdmin && props.isAdmin)) {
    console.log("Showing provider loading state");
    return <JoinSessionLoadingState 
      onRetry={retryConnection}
      retryCount={connectionAttempts} 
    />;
  }
  
  // If error, show error state
  if (props.error || error) {
    console.log("Showing provider error state:", props.error || error);
    return <JoinSessionLoadingState 
      error={props.error || error} 
      onRetry={retryConnection}
      retryCount={connectionAttempts} 
    />;
  }
  
  // If no conversation ID and not loading, show error
  if (!props.currentConversationId && !isLoading && !effectiveAdmin) {
    console.error("No conversation ID found in session provider, but no error was returned");
    return <JoinSessionLoadingState 
      error="Session not found. Please try again." 
      onRetry={retryConnection}
      retryCount={connectionAttempts} 
    />;
  }
  
  // If we get here, we have a conversation and no errors, show session
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
