
import React from "react";
import { SessionContextProps } from "@/types/session";
import { createLogger } from "@/utils/debugLogger";

interface SessionStateDebuggerProps {
  props: SessionContextProps;
  sessionStarted: boolean;
  shouldShowSession: boolean;
  isTransitioning: boolean;
  currentParticipants: number;
  maxParticipants: number;
}

// This component doesn't render anything visible, it just logs debug info
const SessionStateDebugger: React.FC<SessionStateDebuggerProps> = ({
  props,
  sessionStarted,
  shouldShowSession,
  isTransitioning,
  currentParticipants,
  maxParticipants
}) => {
  const logger = createLogger("SessionStateDebugger", "state");
  
  // Log session state for debugging
  React.useEffect(() => {
    logger.log("Session state", {
      shouldShowSession,
      isSessionStartedInDB: props.isSessionStartedInDB,
      sessionStarted,
      isSessionFull: maxParticipants > 0 && currentParticipants >= maxParticipants,
      isTransitioning,
      currentParticipants,
      maxParticipants,
      messageCount: props.sessionState.messages.length,
      participantsCount: props.participants.length,
      conversation: props.conversation ? "exists" : "missing",
      conversationId: props.currentConversationId
    });
  }, [
    props.isSessionStartedInDB, 
    sessionStarted, 
    shouldShowSession,
    isTransitioning,
    currentParticipants,
    maxParticipants,
    props.sessionState.messages.length,
    props.participants.length,
    props.conversation,
    props.currentConversationId
  ]);
  
  return null; // This component doesn't render anything visible
};

export default SessionStateDebugger;
