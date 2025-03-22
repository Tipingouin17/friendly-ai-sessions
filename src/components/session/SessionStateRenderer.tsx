
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
      sessionStarted,
      pathname: window.location.pathname
    });
  }, [props, isLoading, error, effectiveAdmin, connectionAttempts, sessionStarted]);
  
  // If admin status detected but not reflected in props, update the UI
  useEffect(() => {
    if (effectiveAdmin && !props.isAdmin) {
      console.log("Admin status detected but not reflected in props. Forcing admin override in SessionStateRenderer");
    }
  }, [effectiveAdmin, props.isAdmin]);

  // Separate handling for admin route specific rendering
  const isOnAdminRoute = window.location.pathname.includes('/admin');
  const isParticipantPath = window.location.pathname.includes('/session') && !isOnAdminRoute;
  
  // CRITICAL FIX: For participant routes, don't use session storage admin status
  const shouldUseAdminPrivileges = isParticipantPath ? 
    (props.isAdmin || false) : effectiveAdmin;
  
  // If on dedicated admin route, bypass most checks and show session directly
  if (isOnAdminRoute || (shouldUseAdminPrivileges && props.isAdmin)) {
    console.log("🔑 On admin route or confirmed admin - bypassing error screens");
    
    if (!props.conversation && props.refetch) {
      console.log("Admin view: No conversation data found, attempting to force refresh data");
      props.refetch();
    }
    
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

  // Special handling for session full errors
  const isSessionFullError = error?.includes("full") || error?.includes("maximum capacity") || 
                           props.error?.includes("full") || props.error?.includes("maximum capacity");
  
  // Admin users bypass session full errors even if not on admin route
  if (shouldUseAdminPrivileges && isSessionFullError) {
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
  
  // CRITICAL FIX: Add clearer loading state transitions for participants
  // If loading and no conversation, show loading state
  if ((isLoading || props.isLoading) && !props.conversation) {
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
  if (!props.currentConversationId && !isLoading && !props.isLoading) {
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
        isAdmin: props.isAdmin
      }}
      isAdmin={props.isAdmin}
      sessionStarted={sessionStarted}
      setSessionStarted={setSessionStarted}
      onSessionFull={handleSessionFull}
    />
  );
};

export default SessionStateRenderer;
