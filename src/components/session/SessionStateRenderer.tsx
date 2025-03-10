
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
  
  // If admin status detected but not reflected in props, update the UI
  useEffect(() => {
    if (effectiveAdmin && !props.isAdmin) {
      console.log("Admin status detected but not reflected in props. Forcing admin override in SessionStateRenderer");
    }
  }, [effectiveAdmin, props.isAdmin]);

  // Special handling for admin users with session full errors
  const isSessionFullError = error?.includes("full") || error?.includes("maximum capacity");
  
  if (effectiveAdmin && isSessionFullError) {
    console.log("🔑 Admin detected with session full error - bypassing error screen");
    toast({
      title: "Admin Override",
      description: "Session is full, but you're connecting as an admin."
    });
    
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
