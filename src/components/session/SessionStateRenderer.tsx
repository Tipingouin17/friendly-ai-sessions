/**
 * Session State Renderer
 *
 * Session component for the AIfacilitator application.
 */

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
    // State tracking effect — intentionally empty, dependencies listed for future debugging
  }, [props, isLoading, error, effectiveAdmin, connectionAttempts, sessionStarted]);

  const isOnAdminRoute = window.location.pathname.includes('/admin');
  const isParticipantPath = window.location.pathname.includes('/session') && !isOnAdminRoute;
  const urlParams = new URLSearchParams(window.location.search);
  const hasSessionId = urlParams.has('id') && !!urlParams.get('id');
  const hasParticipantIdentity = urlParams.has('participantId') || urlParams.has('name') || urlParams.has('token');
  const isBareParticipantSessionRoute = window.location.pathname === '/session' && !hasSessionId && !hasParticipantIdentity;
  
  const shouldUseAdminPrivileges = isParticipantPath ? 
    (props.isAdmin || false) : effectiveAdmin;
  
  if (isOnAdminRoute || (shouldUseAdminPrivileges && props.isAdmin)) {
    
    if (!props.conversation && props.refetch) {
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
    
    if (!props.conversation) {
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
  
  if (isBareParticipantSessionRoute) {
    return <JoinSessionLoadingState
      error="This session link is missing required session information. Please use the invite link from your host or return home."
      onRetry={retryConnection}
      retryCount={connectionAttempts}
    />;
  }

  if ((isLoading || props.isLoading) && !props.conversation) {
    return <JoinSessionLoadingState 
      onRetry={retryConnection}
      retryCount={connectionAttempts} 
    />;
  }
  
  if (props.error || error) {
    return <JoinSessionLoadingState 
      error={props.error || error} 
      onRetry={retryConnection}
      retryCount={connectionAttempts} 
    />;
  }
  
  if (!props.currentConversationId && !isLoading && !props.isLoading) {
    // Only treat this as a hard error when a session ID was explicitly provided in the URL.
    // Without an ?id= param the user may be navigating here before a conversation has been
    // created (e.g. right after session creation), so we show the loading spinner instead
    // of a misleading "Session not found" error message.
    if (hasSessionId) {
      console.error("No conversation ID found in session provider, but no error was returned");
      return <JoinSessionLoadingState 
        error="Session not found. Please try again." 
        onRetry={retryConnection}
        retryCount={connectionAttempts} 
      />;
    }

    return <JoinSessionLoadingState
      error="This session link is missing required session information. Please use the invite link from your host or return home."
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
