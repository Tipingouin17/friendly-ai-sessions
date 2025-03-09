
import React, { useEffect, useState, useRef } from "react";
import { SessionContextProps } from "@/types/session";
import LoadingState from "./LoadingState";
import EmptyState from "./EmptyState";
import { SessionStateProvider } from "@/contexts/SessionStateProvider";
import { useToast } from "@/components/ui/use-toast";
import { useSessionStateTransition } from "@/hooks/useSessionStateTransition";
import SessionViewSelector from "./SessionViewSelector";
import SessionStateDebugger from "./SessionStateDebugger";
import { useSessionInitialization } from "@/hooks/useSessionInitialization";

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
  
  // Use our new initialization hook
  const { initializing } = useSessionInitialization({
    props,
    setSessionStarted
  });
  
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
