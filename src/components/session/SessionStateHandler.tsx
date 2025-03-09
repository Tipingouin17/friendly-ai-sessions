
import React, { useEffect } from "react";
import { SessionContextProps } from "@/types/session";
import LoadingState from "./LoadingState";
import EmptyState from "./EmptyState";
import AdminQrView from "./AdminQrView";
import ParticipantWaitingScreen from "./ParticipantWaitingScreen";
import SessionView from "./SessionView";

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
  // Update sessionStarted state based on DB status
  useEffect(() => {
    if (props.isSessionStartedInDB) {
      console.log("Session started status from DB:", props.isSessionStartedInDB);
      setSessionStarted(true);
    }
  }, [props.isSessionStartedInDB, setSessionStarted]);

  if (props.isLoading) return <LoadingState />;
  if (!props.conversation || !props.currentConversationId) return <EmptyState />;

  // Check if we should automatically show session (all participants joined)
  const maxParticipants = props.conversation.participants || 0;
  const currentParticipants = props.conversation.current_participants || 0;
  const isSessionFull = maxParticipants > 0 && currentParticipants >= maxParticipants;
  
  // Calculate if session should be shown
  const shouldShowSession = props.isSessionStartedInDB || sessionStarted || isSessionFull;

  // Log session state for debugging
  console.log("Session state:", {
    shouldShowSession,
    isSessionStartedInDB: props.isSessionStartedInDB,
    sessionStarted,
    isSessionFull,
    currentParticipants,
    maxParticipants,
    messageCount: props.sessionState.messages.length
  });

  // Admin view gets QR code view for sharing until session is started
  if (isAdmin && !shouldShowSession && props.showQrCodeView) {
    return (
      <AdminQrView
        conversationId={props.currentConversationId}
        currentParticipantCount={props.conversation.current_participants || 0}
        maxParticipants={props.conversation.participants || 0}
        facilitatorTitle={props.conversation.sessions?.facilitator_details?.title}
        onStartSession={() => {
          props.handleStartSession();
          setSessionStarted(true);
        }}
        onSessionFull={onSessionFull}
      />
    );
  }
  
  // For non-admins, show waiting screen until admin starts the session
  if (!isAdmin && !shouldShowSession) {
    return (
      <ParticipantWaitingScreen
        currentParticipantCount={props.conversation.current_participants || 0}
        maxParticipants={props.conversation.participants || 0}
        facilitatorTitle={props.conversation.sessions?.facilitator_details?.title}
      />
    );
  }

  // Show the main session view
  return <SessionView props={props} isAdmin={isAdmin} />;
};

export default SessionStateHandler;
