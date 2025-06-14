
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
  const transitionTimeout = useRef<NodeJS.Timeout | null>(null);
  const hasResolvedTransition = useRef(false);
  const participantEventChannelRef = useRef<any>(null);
  
  // Listen for session end events (for participants)
  useSessionEndListener(props.currentConversationId, isAdmin);
  
  // Force show session if stuck in transition
  useEffect(() => {
    // Clear any existing timeout
    if (transitionTimeout.current) {
      clearTimeout(transitionTimeout.current);
    }

    // If we're in a transition state, set a timeout to force complete it
    if (isTransitioning && !hasResolvedTransition.current) {
      transitionTimeout.current = setTimeout(() => {
        /* console.log("Force resolving transition state after timeout"); */
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
  
  // Listen for participant removal events
  useEffect(() => {
    if (!props.currentConversationId || !props.currentUserParticipantId || isAdmin) return;

    // Using a more unique channel name with current timestamp
    // to avoid conflicts and ensure unique channels
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
          // Check if this is a participant removal event
          if (payload.new && 
              payload.new.event_type === 'participant_removed' && 
              payload.new.data && 
              payload.new.data.participant_id === props.currentUserParticipantId) {
            
            /* console.log("Current participant has been removed from session"); */
            
            // Show toast notification
            toast({
              title: "Removed from session",
              description: "You have been removed from this session by the admin.",
              variant: "destructive",
            });
            
            // Clear local data and navigate away
            setTimeout(() => {
              // Clear any locally stored session data
              try {
                localStorage.removeItem('participant_session');
                sessionStorage.removeItem('isAdminSession');
              } catch (err) {
                console.error("Error clearing session storage:", err);
              }
              
              // Navigate back to home page
              navigate('/');
            }, 2000);
          }
        })
        .subscribe();
        
      /* console.log("Subscribed to participant removal events"); */
      
      // Store the channel in the ref for cleanup
      participantEventChannelRef.current = channel;
    } catch (err) {
      console.error("Error subscribing to participant events:", err);
    }
    
    return () => {
      if (participantEventChannelRef.current) {
        try {
          // Use a safer approach to cleanup channels
          const channel = participantEventChannelRef.current;
          participantEventChannelRef.current = null; // Clear the ref first
          
          // Then attempt to remove the channel
          supabase.removeChannel(channel);
        } catch (err) {
          console.error("Error removing participant events channel:", err);
        }
      }
    };
  }, [props.currentConversationId, props.currentUserParticipantId, navigate, toast, isAdmin]);
  
  // Safety check for null values
  if (!props.conversation) {
    /* console.log("No conversation in SessionViewSelector"); */
    return <EmptyState />;
  }

  // Error handling
  if (props.error) {
    /* console.log("Showing error state:", props.error); */
    return (
      <JoinSessionLoadingState 
        error={props.error} 
        onRetry={() => props.refetch()}
        retryCount={props.connectionAttempts}
      />
    );
  }

  // Check if we should force the main session view for admin paths
  const isOnAdminPath = window.location.pathname.includes('/admin');
  
  // For admin paths, always show the main session view (admin dashboard)
  if (isOnAdminPath) {
    /* console.log("Admin path detected - showing session view"); */
    return <SessionView props={props} isAdmin={true} />;
  }

  // For regular session pages, check if we should show QR code or session
  const forceShowSession = props.isSessionStartedInDB || sessionStarted || hasResolvedTransition.current;
  
  if (forceShowSession && !props.showQrCodeView) {
    /* console.log("Force showing session view due to session started or timeout"); */
    return <SessionView props={props} isAdmin={isAdmin} />;
  }

  // Admin view gets QR code view for sharing (even if session is started)
  if (isAdmin && props.showQrCodeView) {
    /* console.log("Rendering AdminQrView"); */
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
  if (!isAdmin && !shouldShowSession) {
    /* console.log("Rendering ParticipantWaitingScreen"); */
    return (
      <ParticipantWaitingScreen
        conversationId={props.currentConversationId as number}
        currentParticipantCount={props.conversation?.current_participants || 0}
        maxParticipants={props.conversation?.participants || 0}
        facilitatorTitle={props.conversation.sessions?.facilitator_details?.title}
        onSessionStarted={() => {
          console.log("Session started callback from ParticipantWaitingScreen");
          onStartSession();
        }}
      />
    );
  }

  // Show loading if transitioning between states (but with a time limit now)
  if (isTransitioning && !hasResolvedTransition.current) {
    /* console.log("Showing transition loading state"); */
    return <LoadingState />;
  }

  // Show the main session view
  /* console.log("Rendering main SessionView"); */
  return <SessionView props={props} isAdmin={isAdmin} />;
};

export default SessionViewSelector;
