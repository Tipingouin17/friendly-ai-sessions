/**
 * Session State Handler
 *
 * Session component for the AIfacilitator application.
 *
 * BUG-C FIX (definitive): Previously, the handler returned <LoadingState /> for
 * 500ms (artificial delay from useSessionInitialization), then swapped to
 * <ParticipantWaitingScreen> or <SessionViewSelector>. Each swap unmounts the
 * previous component and mounts the new one, causing a white flash.
 *
 * The fix: for participants, we NEVER render <LoadingState> as a separate
 * component. Instead, we pass a `isParticipantLoading` flag down to
 * SessionViewSelector so it can keep the single <ParticipantLoadingShell>
 * mounted with phase="connecting" during the initial load — no unmount/remount.
 */

import React, { useState, useEffect } from "react";
import { SessionContextProps } from "@/types/session";
import EmptyState from "./EmptyState";
import { SessionStateProvider } from "@/contexts/SessionStateProvider";
import { useToast } from "@/components/ui/use-toast";
import { useSessionStateTransition } from "@/hooks/useSessionStateTransition";
import SessionViewSelector from "./SessionViewSelector";
import SessionStateDebugger from "./SessionStateDebugger";
import ParticipantLoadingShell from "./ParticipantLoadingShell";

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
  transitionState
}) => {
    const { toast } = useToast();
    const isOnAdminPath = window.location.pathname.includes('/admin');

    // Force session to be shown when on admin route
    useEffect(() => {
      if (isOnAdminPath && !sessionStarted) {
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

    // ── Participant loading state ─────────────────────────────────────────────
    // CRITICAL: Do NOT render <ParticipantLoadingShell> here for participants.
    // If we do, React mounts one instance here, then unmounts it and mounts a
    // NEW instance inside <SessionViewSelector> once isLoading becomes false.
    // That unmount/remount causes the white flash.
    //
    // Instead, we pass `isParticipantLoading` down to SessionViewSelector so it
    // can keep the SAME <ParticipantLoadingShell> mounted with phase="connecting"
    // throughout the entire pre-session flow.
    const isParticipant = !isAdmin && !isOnAdminPath;

    if (props.isLoading) {
      if (!isParticipant) {
        // For admin/host: a simple spinner is fine (no flash concern)
        return (
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        );
      }
      // For participants: fall through to SessionViewSelector with isParticipantLoading=true
      // so the same ParticipantLoadingShell instance stays mounted.
    }

    if (props.error) {
      if (isParticipant) {
        // Route participant errors through the unified shell so they never see
        // a different design.
        return (
          <ParticipantLoadingShell
            phase="error"
            errorMessage={props.error}
            onRetry={() => props.refetch?.()}
          />
        );
      }
      // Admin/host: simple inline error card is fine
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Session Error</h2>
            <p className="text-gray-700">{props.error}</p>
          </div>
        </div>
      );
    }

    // For participants: even when isLoading=true, we still need conversation data
    // to render ParticipantLoadingShell (for the facilitator title). If we don't
    // have it yet, show a minimal shell without the title.
    if (!props.conversation && !isParticipant) {
      return <EmptyState />;
    }

    if (!props.currentConversationId && !isParticipant) {
      return <EmptyState />;
    }

    // Always show session for admin route
    if (isOnAdminPath) {
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
          isParticipantLoading={isParticipant && !!props.isLoading}
          onStartSession={() => {
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
      setSessionStarted(true);
    }
  }, [isOnAdminPath, sessionStarted, setSessionStarted]);

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
      transitionState={transitionState}
    />
  );
};

export default SessionStateHandler;
