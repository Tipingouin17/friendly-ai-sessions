
import React, { useEffect } from "react";
import { SessionContextProps } from "@/types/session";
import LoadingState from "./LoadingState";
import EmptyState from "./EmptyState";
import AdminQrView from "./AdminQrView";
import ParticipantWaitingScreen from "./ParticipantWaitingScreen";
import SessionView from "./SessionView";
import { SessionStateProvider } from "@/contexts/SessionStateProvider";
import { useToast } from "@/components/ui/use-toast";

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
  
  // Update sessionStarted state based on DB status
  useEffect(() => {
    if (props.isSessionStartedInDB) {
      console.log("Session started status from DB:", props.isSessionStartedInDB);
      setSessionStarted(true);
    }
  }, [props.isSessionStartedInDB, setSessionStarted]);

  if (props.isLoading) return <LoadingState />;
  if (!props.conversation || !props.currentConversationId) return <EmptyState />;

  // Wrap everything in our state provider
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
      <SessionStateContent
        props={props}
        isAdmin={isAdmin}
        sessionStarted={sessionStarted}
        setSessionStarted={setSessionStarted}
        onSessionFull={onSessionFull}
      />
    </SessionStateProvider>
  );
};

// Separate component to use the context
const SessionStateContent: React.FC<{
  props: SessionContextProps;
  isAdmin: boolean;
  sessionStarted: boolean;
  setSessionStarted: (started: boolean) => void;
  onSessionFull: () => void;
}> = ({
  props,
  isAdmin,
  sessionStarted,
  setSessionStarted,
  onSessionFull
}) => {
  // Calculate if session should be shown
  const maxParticipants = props.conversation?.participants || 0;
  const currentParticipants = props.conversation?.current_participants || 0;
  const isSessionFull = maxParticipants > 0 && currentParticipants >= maxParticipants;
  const shouldShowSession = props.isSessionStartedInDB || sessionStarted || isSessionFull;

  // Log session state for debugging
  console.log("Session state:", {
    shouldShowSession,
    isSessionStartedInDB: props.isSessionStartedInDB,
    sessionStarted,
    isSessionFull,
    currentParticipants,
    maxParticipants,
    messageCount: props.sessionState.messages.length,
    participantsCount: props.participants.length
  });

  // Admin view gets QR code view for sharing until session is started
  if (isAdmin && !shouldShowSession && props.showQrCodeView) {
    return (
      <AdminQrView
        conversationId={props.currentConversationId}
        currentParticipantCount={currentParticipants}
        maxParticipants={maxParticipants}
        facilitatorTitle={props.conversation.sessions?.facilitator_details?.title}
        onStartSession={() => {
          console.log("Start session button clicked in AdminQrView");
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
        conversationId={props.currentConversationId}
        currentParticipantCount={currentParticipants}
        maxParticipants={maxParticipants}
        facilitatorTitle={props.conversation.sessions?.facilitator_details?.title}
        onSessionStarted={() => {
          console.log("Session started callback from ParticipantWaitingScreen");
          setSessionStarted(true);
        }}
      />
    );
  }

  // Show the main session view
  return <SessionView props={props} isAdmin={isAdmin} />;
};

export default SessionStateHandler;
