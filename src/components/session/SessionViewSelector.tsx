
import React, { useEffect } from "react";
import LoadingState from "./LoadingState";
import EmptyState from "./EmptyState";
import AdminQrView from "./AdminQrView";
import ParticipantWaitingScreen from "./ParticipantWaitingScreen";
import SessionView from "./SessionView";
import { SessionContextProps } from "@/types/session";
import { useToast } from "@/components/ui/use-toast";
import JoinSessionLoadingState from "./JoinSessionLoadingState";

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
  
  // Safety check for null values
  if (!props.conversation) {
    console.log("No conversation in SessionViewSelector");
    return <EmptyState />;
  }

  // Error handling
  if (props.error) {
    console.log("Showing error state:", props.error);
    return (
      <JoinSessionLoadingState 
        error={props.error} 
        onRetry={() => props.refetch()}
        retryCount={props.connectionAttempts}
      />
    );
  }

  // Force showing the session view if we're on an admin route
  // CRITICAL FIX: Always show sessions for admin paths
  const isOnAdminPath = window.location.pathname.includes('/admin');
  if (isOnAdminPath) {
    console.log("Admin route detected, forcing session view");
    return <SessionView props={props} isAdmin={true} />;
  }

  // Admin view gets QR code view for sharing until session is started
  if (isAdmin && !shouldShowSession && props.showQrCodeView) {
    console.log("Rendering AdminQrView");
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
    console.log("Rendering ParticipantWaitingScreen");
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

  // Show loading if transitioning between states
  if (isTransitioning) {
    console.log("Showing transition loading state");
    return <LoadingState />;
  }

  // Show the main session view
  console.log("Rendering main SessionView");
  return <SessionView props={props} isAdmin={isAdmin} />;
};

export default SessionViewSelector;
