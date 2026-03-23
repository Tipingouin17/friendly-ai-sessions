
import React, { useState, useEffect } from "react";
import { SessionContextProps } from "@/types/session";
import LoadingState from "./LoadingState";
import EmptyState from "./EmptyState";
import { SessionStateProvider } from "@/contexts/SessionStateProvider";
import { useToast } from "@/components/ui/use-toast";
import { useSessionStateTransition } from "@/hooks/useSessionStateTransition";
import SessionViewSelector from "./SessionViewSelector";
import SessionStateDebugger from "./SessionStateDebugger";
import { useSessionInitialization } from "@/hooks/useSessionInitialization";
import ParticipantWaitingScreen from "./ParticipantWaitingScreen";

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
    isSessionFull: boolean;
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
    const { toast } = useToast();
    const isOnAdminPath = window.location.pathname.includes('/admin');

    // Force session to be shown when on admin route
    useEffect(() => {
      if (isOnAdminPath && !sessionStarted) {
        console.log("Forcing session started state for admin route");
        setSessionStarted(true);
      }
    }, [isOnAdminPath, sessionStarted, setSessionStarted]);

    // When admin loads the page, check if they need to be notified of anything
    useEffect(() => {
      if (isAdmin && props.conversation) {
        // Check if session is ready to start
        if (transitionState.currentParticipants > 0 && !sessionStarted && !props.isSessionStartedInDB) {
          toast({
            title: "Participants waiting",
            description: `You have ${transitionState.currentParticipants} participant(s) waiting to start.`,
          });
        }

        // Show admin controls hint
        if (!sessionStarted && !props.isSessionStartedInDB) {
          toast({
            title: "Admin Controls Available",
            description: "You're viewing the session as an admin. You can start the session and invite participants.",
          });
        }
      }
    }, [isAdmin, sessionStarted, transitionState.currentParticipants, toast, props.conversation, props.isSessionStartedInDB]);

    // Error and loading states are handled first with early returns
    if (props.isLoading || initializing) {
      console.log("Showing loading state - isLoading:", props.isLoading, "initializing:", initializing);
      return <LoadingState />;
    }

    if (props.error) {
      console.log("Showing error state:", props.error);
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Session Error</h2>
            <p className="text-gray-700">{props.error}</p>
          </div>
        </div>
      );
    }

    if (!props.conversation) {
      console.log("No conversation data, showing empty state");
      return <EmptyState />;
    }

    if (!props.currentConversationId) {
      console.log("No conversation ID, showing empty state");
      return <EmptyState />;
    }

    // Check if this is a participant (not admin) and session hasn't started
    const isParticipant = !isAdmin && !isOnAdminPath;
    const sessionHasStarted = props.isSessionStartedInDB || sessionStarted;

    console.log("Session state check:", {
      isParticipant,
      sessionHasStarted,
      isSessionStartedInDB: props.isSessionStartedInDB,
      sessionStarted,
      currentParticipants: transitionState.currentParticipants
    });

    // If participant and session hasn't started, show waiting screen
    if (isParticipant && !sessionHasStarted) {
      console.log("Showing participant waiting screen");
      return (
        <ParticipantWaitingScreen
          conversationId={props.currentConversationId}
          currentParticipantCount={transitionState.currentParticipants}
          maxParticipants={transitionState.maxParticipants}
          facilitatorTitle={props.conversation?.sessions?.facilitator_details?.title}
          onSessionStarted={() => {
            console.log("Session started callback triggered");
            setSessionStarted(true);
          }}
        />
      );
    }

    // Always show session for admin route
    if (isOnAdminPath) {
      console.log("Admin route detected in SessionContent, bypassing transition logic");
      return (
        <SessionStateProvider
          sessionData={props}
          isAdmin={true}
          onSessionFull={onSessionFull}
          onError={(error) => {
            console.error("Session error:", error);
            toast({
              title: "Session Error",
              description: error,
              variant: "destructive"
            });
          }}
        >
          <SessionViewSelector
            props={props}
            isAdmin={true}
            sessionStarted={true}
            isTransitioning={false}
            shouldShowSession={true}
            onStartSession={transitionState.handleStartSession}
            onSessionFull={onSessionFull}
          />
        </SessionStateProvider>
      );
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
          toast({
            title: "Session Error",
            description: error,
            variant: "destructive"
          });
        }}
      >
        {isAdmin && (
          <SessionStateDebugger
            props={props}
            sessionStarted={sessionStarted}
            shouldShowSession={shouldShowSession}
            isTransitioning={isTransitioning}
            currentParticipants={currentParticipants}
            maxParticipants={maxParticipants}
          />
        )}

        <SessionViewSelector
          props={props}
          isAdmin={isAdmin}
          sessionStarted={sessionStarted}
          isTransitioning={isTransitioning}
          shouldShowSession={shouldShowSession}
          onStartSession={() => {
            console.log("Start session button clicked in SessionViewSelector");
            toast({
              title: "Starting Session",
              description: "The session is now starting for all participants.",
            });
            handleStartSession();
          }}
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
  // Always call all hooks unconditionally at the top level in the same order
  const { toast } = useToast();

  // Check if on admin route
  const isOnAdminPath = window.location.pathname.includes('/admin');

  // Force start session if on admin route
  useEffect(() => {
    if (isOnAdminPath && !sessionStarted) {
      console.log("Admin route detected, forcing session start");
      setSessionStarted(true);
    }
  }, [isOnAdminPath, sessionStarted, setSessionStarted]);

  // Use initialization hook - called unconditionally
  const { initializing } = useSessionInitialization({
    props,
    setSessionStarted,
    isAdmin: isAdmin || isOnAdminPath
  });

  // Use transition state hook - called unconditionally
  const transitionState = useSessionStateTransition({
    props,
    isAdmin: isAdmin || isOnAdminPath,
    sessionStarted: sessionStarted || isOnAdminPath,
    setSessionStarted,
    onSessionFull
  });

  // Render the content separately to avoid conditional hook calls
  return (
    <SessionContent
      props={props}
      isAdmin={isAdmin || isOnAdminPath}
      sessionStarted={sessionStarted || isOnAdminPath}
      setSessionStarted={setSessionStarted}
      onSessionFull={onSessionFull}
      initializing={initializing}
      transitionState={transitionState}
    />
  );
};

export default SessionStateHandler;
