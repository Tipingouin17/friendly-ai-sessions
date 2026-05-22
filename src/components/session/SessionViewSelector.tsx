/**
 * Session View Selector
 *
 * Session component for the AIfacilitator application.
 *
 * BUG-C FIX: Previously, each participant loading state was a completely
 * separate component (LoadingState, ParticipantWaitingScreen, SessionStartingGate).
 * React would unmount the old component and mount the new one on every state
 * transition, causing a white flash between states.
 *
 * The fix: for participants, we keep a SINGLE <ParticipantLoadingShell> mounted
 * throughout the entire pre-session flow and simply update its `phase` prop.
 * Only when the session is fully ready do we swap to <SessionView>.
 */

import React, { useEffect, useRef } from "react";
import EmptyState from "./EmptyState";
import AdminQrView from "./AdminQrView";
import SessionView from "./SessionView";
import ParticipantLoadingShell, { ParticipantLoadingPhase } from "./ParticipantLoadingShell";
import { SessionContextProps } from "@/types/session";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import api, { clearAllParticipantState } from "@/lib/api";
import { useSessionEndListener } from "@/hooks/useSessionEndListener";
import { useSecurityAudit } from "@/hooks/useSecurityAudit";
import { useWelcomeMessageGate } from "@/hooks/useWelcomeMessageGate";

interface SessionViewSelectorProps {
  props: SessionContextProps;
  isAdmin: boolean;
  sessionStarted: boolean;
  isTransitioning: boolean;
  shouldShowSession: boolean;
  /** When true, the participant data is still loading — show phase="connecting" */
  isParticipantLoading?: boolean;
  onStartSession: () => void;
  onSessionFull: () => void;
}

const SessionViewSelector: React.FC<SessionViewSelectorProps> = ({
  props,
  isAdmin,
  sessionStarted,
  isTransitioning,
  shouldShowSession,
  isParticipantLoading = false,
  onStartSession,
  onSessionFull
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { logSecurityViolation } = useSecurityAudit();
  const participantEventChannelRef = useRef<any>(null);
  const processedEventIds = useRef<Set<string>>(new Set());
  const isNavigatingRef = useRef(false);
  const sessionTransitionRef = useRef(false);

  // Check session state to determine what view to show
  const sessionStartedInDB = props.isSessionStartedInDB || sessionStarted;

  // Welcome message gate for participants
  const {
    isWaitingForMessage,
    messageReady,
    timeoutReached,
    waitForWelcomeMessage,
    forceGenerateWelcomeMessage
  } = useWelcomeMessageGate({
    conversationId: props.currentConversationId,
    isAdmin,
    sessionStarted: sessionStartedInDB
  });

  // Listen for session end events (for participants)
  useSessionEndListener(props.currentConversationId, isAdmin);

  // Security check: Ensure participants can't access admin view
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (currentPath.includes('/admin') && !isAdmin) {
      logSecurityViolation('unauthorized_admin_route_access', {
        path: currentPath,
        conversationId: props.currentConversationId
      });

      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin interface.",
        variant: "destructive",
      });

      navigate('/session');
    }
  }, [isAdmin, navigate, toast, logSecurityViolation, props.currentConversationId]);

  // Track session state transitions to prevent navigation during auto-start
  useEffect(() => {
    if (sessionStarted && !sessionTransitionRef.current) {
      sessionTransitionRef.current = true;
      setTimeout(() => {
        sessionTransitionRef.current = false;
      }, 3000);
    }
  }, [sessionStarted]);

  // Trigger welcome message wait when session starts
  useEffect(() => {
    if (!isAdmin && sessionStartedInDB && !isWaitingForMessage && !messageReady) {
      waitForWelcomeMessage().catch((err) => {
        // AbortError is expected when the component unmounts mid-flight — suppress it.
        if (err?.name !== 'AbortError' && !err?.message?.toLowerCase().includes('abort')) {
          console.error('[SessionViewSelector] waitForWelcomeMessage error:', err);
        }
      });
    }
  }, [isAdmin, sessionStartedInDB, isWaitingForMessage, messageReady, waitForWelcomeMessage]);

  // Enhanced participant removal event listener
  useEffect(() => {
    if (!props.currentConversationId || !props.currentUserParticipantId || isAdmin) return;

    const channelName = `participant-events-${props.currentConversationId}-${props.currentUserParticipantId}`;

    try {
      const channel = api
        .channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'session_events',
          filter: `conversation_id=eq.${props.currentConversationId}`
        }, (payload) => {
          const eventId = `${payload.new.id}-${payload.new.created_at}`;

          if (processedEventIds.current.has(eventId)) return;
          processedEventIds.current.add(eventId);

          if (sessionTransitionRef.current) return;
          if (isNavigatingRef.current) return;

          if (
            payload.new &&
            payload.new.event_type === 'participant_removed' &&
            payload.new.data &&
            typeof payload.new.data === 'object' &&
            payload.new.data.participant_id === props.currentUserParticipantId
          ) {
            const eventData = payload.new.data;
            if (!eventData.removed_by_admin && !eventData.reason) return;

            isNavigatingRef.current = true;

            toast({
              title: "Removed from session",
              description: "You have been removed from this session by the admin.",
              variant: "destructive",
            });

            setTimeout(() => {
              try {
                // Clear ALL scoped participant state (mf_join_token_N,
                // participantSessionData_N) so the removed participant cannot
                // silently rejoin using their stale cached token/slot.
                clearAllParticipantState();
                localStorage.removeItem('participant_session'); // legacy key
                sessionStorage.removeItem('isAdminSession');
              } catch (err) {
                console.error("Error clearing session storage:", err);
              }
              navigate('/');
            }, 2000);
          }
        })
        .subscribe();

      participantEventChannelRef.current = channel;
    } catch (err) {
      console.error("Error subscribing to participant events:", err);
    }

    return () => {
      if (participantEventChannelRef.current) {
        try {
          const channel = participantEventChannelRef.current;
          participantEventChannelRef.current = null;
          api.removeChannel(channel);
        } catch (err) {
          console.error("Error removing participant events channel:", err);
        }
      }
      processedEventIds.current.clear();
    };
  }, [props.currentConversationId, props.currentUserParticipantId, navigate, toast, isAdmin]);

  // ── Safety check ──────────────────────────────────────────────────────────
  if (!props.conversation) {
    return <EmptyState />;
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (props.error) {
    return (
      <ParticipantLoadingShell
        phase="error"
        facilitatorTitle={props.conversation.sessions?.facilitator_details?.title}
        errorMessage={props.error}
        onRetry={() => props.refetch()}
        retryCount={props.connectionAttempts}
      />
    );
  }

  // ── Admin: QR lobby ───────────────────────────────────────────────────────
  if (isAdmin && !sessionStartedInDB) {
    return (
      <AdminQrView
        conversationId={props.currentConversationId as number}
        currentParticipantCount={props.conversation?.current_participants || 0}
        maxParticipants={props.conversation?.participants || 0}
        facilitatorTitle={props.conversation.sessions?.facilitator_details?.title}
        joinToken={props.conversation?.join_token}
        onStartSession={onStartSession}
        onSessionFull={onSessionFull}
      />
    );
  }

  // ── Participant: unified loading shell ────────────────────────────────────
  // Instead of swapping between different components (which causes white flashes),
  // we keep ONE <ParticipantLoadingShell> mounted and update its `phase` prop.
  // The component animates smoothly between phases without unmounting.
  if (!isAdmin) {
    // Determine which phase we're in
    let phase: ParticipantLoadingPhase;

    if (isParticipantLoading) {
      // Data still loading — keep the shell mounted with connecting phase
      // (same component instance, no unmount/remount = no flash)
      phase = 'connecting';
    } else if (!sessionStartedInDB) {
      // Host hasn't started the session yet
      phase = 'waiting_host';
    } else if (timeoutReached) {
      // AI took too long
      phase = 'timeout';
    } else if (isWaitingForMessage || (!messageReady && !timeoutReached)) {
      // Session started, AI is generating the welcome message
      phase = 'ai_generating';
    } else if (messageReady) {
      // PERF FIX: Skip the 'message_ready' transitioning phase entirely.
      // Previously we kept ParticipantLoadingShell visible for 1.5-2s while
      // isTransitioning=true, adding a visible delay before the chat appeared.
      // Now we render SessionView immediately when messageReady=true.
      return <SessionView props={props} isAdmin={isAdmin} />;
    } else {
      // Fallback: still connecting
      phase = 'connecting';
    }

    return (
      <ParticipantLoadingShell
        phase={phase}
        facilitatorTitle={props.conversation.sessions?.facilitator_details?.title}
        currentParticipantCount={props.conversation?.current_participants || 0}
        maxParticipants={props.conversation?.participants || 0}
        onRetryGeneration={timeoutReached ? forceGenerateWelcomeMessage : undefined}
      />
    );
  }

  // ── Admin or session ready: show main session view ────────────────────────
  return <SessionView props={props} isAdmin={isAdmin} />;
};

export default SessionViewSelector;
