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
  
  useEffect(() => {
    if (effectiveAdmin && !props.isAdmin) {
      console.log("Admin status detected but not reflected in props. Forcing admin override in SessionStateRenderer");
    }
  }, [effectiveAdmin, props.isAdmin]);

  const isOnAdminRoute = window.location.pathname.includes('/admin');
  const isParticipantPath = window.location.pathname.includes('/session') && !isOnAdminRoute;
  
  const shouldUseAdminPrivileges = isParticipantPath ? 
    (props.isAdmin || false) : effectiveAdmin;
  
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

  const isSessionFullError = error?.includes("full") || error?.includes("maximum capacity") || 
                           props.error?.includes("full") || props.error?.includes("maximum capacity");
  
  if (shouldUseAdminPrivileges && isSessionFullError) {
    console.log("🔑 Admin detected with session full error - bypassing error screen");
    
    if (!props.conversation) {
      console.log("Admin bypass: No conversation data found, attempting to force refresh data");
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
  
  if ((isLoading || props.isLoading) && !props.conversation) {
    console.log("Showing provider loading state");
    return <JoinSessionLoadingState 
      onRetry={retryConnection}
      retryCount={connectionAttempts} 
    />;
  }
  
  if (props.error || error) {
    console.log("Showing provider error state:", props.error || error);
    return <JoinSessionLoadingState 
      error={props.error || error} 
      onRetry={retryConnection}
      retryCount={connectionAttempts} 
    />;
  }
  
  if (!props.currentConversationId && !isLoading && !props.isLoading) {
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
