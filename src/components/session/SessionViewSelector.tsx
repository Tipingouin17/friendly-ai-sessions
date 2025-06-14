
import React, { useEffect, useRef } from "react";
import LoadingState from "./LoadingState";
import EmptyState from "./EmptyState";
import AdminQrView from "./AdminQrView";
import ParticipantWaitingScreen from "./ParticipantWaitingScreen";
import SessionView from "./SessionView";
import { SessionContextProps } from "@/types/session";
import { useToast } from "@/components/ui/use-toast";
import JoinSessionLoadingState from "./JoinSessionLoadingState";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSessionEndListener } from "@/hooks/useSessionEndListener";
import { useSecurityAudit } from "@/hooks/useSecurityAudit";

interface SessionViewSelectorProps {
  props: SessionContextProps;
  isAdmin: boolean;
  sessionStarted: boolean;
  isTransitioning: boolean;
  shouldShowSession: boolean;
  onStartSession: () => void;
  onSessionFull: () => void;
}

const SessionViewSelector: React.FC<SessionViewSelectorProps> = ({
  props,
  isAdmin,
  sessionStarted,
  isTransitioning,
  shouldShowSession,
  onStartSession,
  onSessionFull
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { logSecurityViolation } = useSecurityAudit();
  const transitionTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasResolvedTransition = useRef(false);
  const participantEventChannelRef = useRef<any>(null);
  const processedEventIds = useRef<Set<string>>(new Set());
  const isNavigatingRef = useRef(false);
  const sessionTransitionRef = useRef(false);
  
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
      
      // Redirect participants away from admin routes
      navigate('/session');
    }
  }, [isAdmin, navigate, toast, logSecurityViolation, props.currentConversationId]);
  
  // Force show session if stuck in transition
  useEffect(() => {
    // Clear any existing timeout
    if (transitionTimeout.current) {
      clearTimeout(transitionTimeout.current);
    }

    // If we're in a transition state, set a timeout to force complete it
    if (isTransitioning && !hasResolvedTransition.current) {
      transitionTimeout.current = setTimeout(() => {
        hasResolvedTransition.current = true;
      }, 2000);
    }

    // Cleanup
    return () => {
      if (transitionTimeout.current) {
        clearTimeout(transitionTimeout.current);
      }
    };
  }, [isTransitioning]);
  
  // Track session state transitions to prevent navigation during auto-start
  useEffect(() => {
    if (sessionStarted && !sessionTransitionRef.current) {
      console.log("Session starting, setting navigation lock");
      sessionTransitionRef.current = true;
      
      // Clear the lock after a short delay to allow session to stabilize
      setTimeout(() => {
        sessionTransitionRef.current = false;
        console.log("Session transition lock cleared");
      }, 3000);
    }
  }, [sessionStarted]);
  
  // Enhanced participant removal event listener with better validation
  useEffect(() => {
    if (!props.currentConversationId || !props.currentUserParticipantId || isAdmin) return;

    const channelName = `participant-events-${props.currentConversationId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    try {
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'session_events',
          filter: `conversation_id=eq.${props.currentConversationId}`
        }, (payload) => {
          // Create unique event ID to prevent duplicate processing
          const eventId = `${payload.new.id}-${payload.new.created_at}`;
          
          if (processedEventIds.current.has(eventId)) {
            console.log("Duplicate event detected, skipping:", eventId);
            return;
          }
          
          processedEventIds.current.add(eventId);
          
          // Don't process removal events during session transitions
          if (sessionTransitionRef.current) {
            console.log("Session in transition, ignoring participant removal event");
            return;
          }
          
          // Don't process events if we're already navigating
          if (isNavigatingRef.current) {
            console.log("Already navigating, ignoring participant removal event");
            return;
          }
          
          if (payload.new && 
              payload.new.event_type === 'participant_removed' && 
              payload.new.data && 
              typeof payload.new.data === 'object' &&
              payload.new.data.participant_id === props.currentUserParticipantId) {
            
            // Additional validation: ensure this is actually a removal and not a side effect
            const eventData = payload.new.data;
            if (!eventData.removed_by_admin && !eventData.reason) {
              console.log("Invalid removal event data, ignoring");
              return;
            }
            
            console.log("Valid participant removal detected for:", props.currentUserParticipantId);
            
            isNavigatingRef.current = true;
            
            toast({
              title: "Removed from session",
              description: "You have been removed from this session by the admin.",
              variant: "destructive",
            });
            
            setTimeout(() => {
              try {
                localStorage.removeItem('participant_session');
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
          supabase.removeChannel(channel);
        } catch (err) {
          console.error("Error removing participant events channel:", err);
        }
      }
      
      // Clear processed events when component unmounts
      processedEventIds.current.clear();
    };
  }, [props.currentConversationId, props.currentUserParticipantId, navigate, toast, isAdmin]);
  
  // Safety check for null values
  if (!props.conversation) {
    return <EmptyState />;
  }

  // Error handling
  if (props.error) {
    return (
      <JoinSessionLoadingState 
        error={props.error} 
        onRetry={() => props.refetch()}
        retryCount={props.connectionAttempts}
      />
    );
  }

  // Check session state to determine what view to show
  const sessionStartedInDB = props.isSessionStartedInDB || sessionStarted;
  
  // FIXED LOGIC: Admin should see QR view when session hasn't started yet
  if (isAdmin && !sessionStartedInDB) {
    console.log("Rendering AdminQrView - session not started yet");
    return (
      <AdminQrView
        conversationId={props.currentConversationId as number}
        currentParticipantCount={props.conversation?.current_participants || 0}
        maxParticipants={props.conversation?.participants || 0}
        facilitatorTitle={props.conversation.sessions?.facilitator_details?.title}
        onStartSession={() => {
          console.log("Start session button clicked in AdminQrView");
          onStartSession();
        }}
        onSessionFull={onSessionFull}
      />
    );
  }
  
  // For non-admins, show waiting screen until admin starts the session
  if (!isAdmin && !sessionStartedInDB) {
    console.log("Rendering ParticipantWaitingScreen");
    return (
      <ParticipantWaitingScreen
        conversationId={props.currentConversationId as number}
        currentParticipantCount={props.conversation?.current_participants || 0}
        maxParticipants={props.conversation?.participants || 0}
        facilitatorTitle={props.conversation.sessions?.facilitator_details?.title}
        onSessionStarted={() => {
          console.log("Session started callback from ParticipantWaitingScreen - participants should NOT navigate");
          // IMPORTANT: Participants should NOT navigate when session starts
          // They should stay on their current route and just see UI update
          onStartSession();
        }}
      />
    );
  }

  // Show loading if transitioning between states (but with a time limit now)
  if (isTransitioning && !hasResolvedTransition.current) {
    console.log("Showing transition loading state");
    return <LoadingState />;
  }

  // Show the main session view (admin dashboard or participant messaging)
  console.log("Rendering main SessionView", { isAdmin, sessionStartedInDB });
  return <SessionView props={props} isAdmin={isAdmin} />;
};

export default SessionViewSelector;
