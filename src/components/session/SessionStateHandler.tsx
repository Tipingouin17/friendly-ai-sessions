import React, { useEffect, useState, useRef } from "react";
import { SessionContextProps } from "@/types/session";
import LoadingState from "./LoadingState";
import EmptyState from "./EmptyState";
import { SessionStateProvider } from "@/contexts/SessionStateProvider";
import { useToast } from "@/components/ui/use-toast";
import { useSessionStateTransition } from "@/hooks/useSessionStateTransition";
import SessionViewSelector from "./SessionViewSelector";
import SessionStateDebugger from "./SessionStateDebugger";

interface SessionStateHandlerProps {
  props: SessionContextProps;
  isAdmin: boolean;
  sessionStarted: boolean;
  setSessionStarted: (started: boolean) => void;
  onSessionFull: () => void;
}

const SessionStateHandler: React.FC<SessionStateHandlerProps> = ({
  props,
  isAdmin,
  sessionStarted,
  setSessionStarted,
  onSessionFull
}) => {
  const { toast } = useToast();
  const [initializing, setInitializing] = useState(true);
  const initializationTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (initializationTimerRef.current) {
        window.clearTimeout(initializationTimerRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    if (props.isSessionStartedInDB) {
      console.log("Session started status from DB:", props.isSessionStartedInDB);
      setSessionStarted(true);
    }
  }, [props.isSessionStartedInDB, setSessionStarted]);
  
  useEffect(() => {
    if (!mountedRef.current) return;
    
    if (initializing && props.conversation && props.currentConversationId) {
      initializationTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) {
          console.log("Session state initialization complete");
          setInitializing(false);
        }
      }, 1000);
    }
    
    return () => {
      if (initializationTimerRef.current) {
        window.clearTimeout(initializationTimerRef.current);
      }
    };
  }, [initializing, props.conversation, props.currentConversationId]);
  
  useEffect(() => {
    if (!mountedRef.current) return;
    
    const recoverInterval = setInterval(() => {
      if (props.conversation && props.currentConversationId && !props.isConnected) {
        console.log("Session state attempting recovery refetch");
        props.refetch();
      }
    }, 10000);
    
    return () => {
      clearInterval(recoverInterval);
    };
  }, [props.conversation, props.currentConversationId, props.isConnected, props.refetch]);
  
  useEffect(() => {
    if (!mountedRef.current) return;
    
    if (props.isConnected && props.connectionAttempts > 0) {
      console.log("Connection restored after", props.connectionAttempts, "attempts");
      toast({
        title: "Connection Restored",
        description: "Successfully reconnected to the session.",
      });
    }
  }, [props.isConnected, props.connectionAttempts, toast]);
  
  if (props.isLoading || initializing) {
    console.log("Showing loading state - isLoading:", props.isLoading, "initializing:", initializing);
    return <LoadingState />;
  }
  
  if (props.error) {
    console.log("Showing error state:", props.error);
    return null;
  }
  
  if (!props.conversation) {
    console.log("No conversation data, showing empty state");
    return <EmptyState />;
  }
  
  if (!props.currentConversationId) {
    console.log("No conversation ID, showing empty state");
    return <EmptyState />;
  }

  const {
    isTransitioning,
    shouldShowSession,
    currentParticipants,
    maxParticipants,
    handleStartSession
  } = useSessionStateTransition({
    props,
    isAdmin,
    sessionStarted,
    setSessionStarted,
    onSessionFull
  });

  return (
    <SessionStateProvider 
      sessionData={props}
      isAdmin={isAdmin}
      onSessionFull={onSessionFull}
      onError={(error) => {
        console.error("Session error:", error);
        toast({
          title: "Session Error",
          description: error,
          variant: "destructive",
        });
      }}
    >
      <SessionStateDebugger 
        props={props}
        sessionStarted={sessionStarted}
        shouldShowSession={shouldShowSession}
        isTransitioning={isTransitioning}
        currentParticipants={currentParticipants}
        maxParticipants={maxParticipants}
      />
      
      <SessionViewSelector
        props={props}
        isAdmin={isAdmin}
        sessionStarted={sessionStarted}
        isTransitioning={isTransitioning}
        shouldShowSession={shouldShowSession}
        onStartSession={handleStartSession}
        onSessionFull={onSessionFull}
      />
    </SessionStateProvider>
  );
};

export default SessionStateHandler;
