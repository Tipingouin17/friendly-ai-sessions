
import React from "react";
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

// This is a separate component to handle the conditional rendering
// after all hooks have been called in the main component
const SessionContent: React.FC<{
  props: SessionContextProps;
  isAdmin: boolean;
  sessionStarted: boolean;
  setSessionStarted: (started: boolean) => void;
  onSessionFull: () => void;
  initializing: boolean;
  transitionState: {
    isTransitioning: boolean;
    shouldShowSession: boolean;
    currentParticipants: number;
    maxParticipants: number;
    handleStartSession: () => void;
  };
}> = ({
  props,
  isAdmin,
  sessionStarted,
  setSessionStarted,
  onSessionFull,
  initializing,
  transitionState
}) => {
  // Error and loading states are handled first with early returns
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

  // Destructure transition state for cleaner usage
  const {
    isTransitioning,
    shouldShowSession,
    currentParticipants,
    maxParticipants,
    handleStartSession
  } = transitionState;

  return (
    <SessionStateProvider 
      sessionData={props}
      isAdmin={isAdmin}
      onSessionFull={onSessionFull}
      onError={(error) => {
        console.error("Session error:", error);
        // Toast usage is isolated to the SessionStateProvider
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

// Main component that ensures consistent hook order
const SessionStateHandler: React.FC<SessionStateHandlerProps> = ({
  props,
  isAdmin,
  sessionStarted,
  setSessionStarted,
  onSessionFull
}) => {
  // All hooks are called every time in the same order
  const { toast } = useToast();
  
  // Use initialization hook
  const { initializing } = useSessionInitialization({
    props,
    setSessionStarted
  });
  
  // Use transition state hook - called unconditionally
  const transitionState = useSessionStateTransition({
    props,
    isAdmin,
    sessionStarted,
    setSessionStarted,
    onSessionFull
  });

  // Render the content separately to avoid conditional hook calls
  return (
    <SessionContent
      props={props}
      isAdmin={isAdmin}
      sessionStarted={sessionStarted}
      setSessionStarted={setSessionStarted}
      onSessionFull={onSessionFull}
      initializing={initializing}
      transitionState={transitionState}
    />
  );
};

export default SessionStateHandler;
