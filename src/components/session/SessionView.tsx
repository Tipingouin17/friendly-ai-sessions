
import React, { useEffect } from "react";
import SessionContainer from "./SessionContainer";
import { SessionContextProps } from "@/types/session";

interface SessionViewProps {
  props: SessionContextProps;
  isAdmin: boolean;
}

const SessionView: React.FC<SessionViewProps> = ({ props, isAdmin }) => {
  // Set the appropriate viewMode based on user role
  useEffect(() => {
    if (isAdmin && props.sessionState.viewMode !== "admin") {
      props.sessionState.setViewMode("admin");
    } else if (!isAdmin && props.sessionState.viewMode !== "participant") {
      props.sessionState.setViewMode("participant");
    }
  }, [isAdmin, props.sessionState]);

  // Log key properties for debugging
  useEffect(() => {
    console.log("SessionView rendering with:", {
      isAdmin,
      viewMode: props.sessionState.viewMode,
      participantId: props.currentUserParticipantId,
      messagesCount: props.sessionState.messages.length,
      participantCount: props.conversation?.participants || props.participants.length,
      participantDescription: props.conversation?.participant_description || ""
    });
  }, [
    isAdmin, 
    props.sessionState.viewMode, 
    props.currentUserParticipantId, 
    props.sessionState.messages.length,
    props.conversation?.participants,
    props.participants.length,
    props.conversation?.participant_description
  ]);

  return (
    <SessionContainer
      participantCount={props.conversation?.participants || props.participants.length}
      conversation={props.conversation}
      messages={props.sessionState.messages}
      inputMessage={props.sessionState.inputMessage}
      setInputMessage={props.sessionState.setInputMessage}
      currentParticipant={props.sessionState.currentParticipant}
      onSendMessage={props.handleSendMessage}
      isWaitingForResponse={props.isWaitingForResponse}
      onGenerateReport={props.sessionState.handleGenerateReport}
      isGeneratingReport={props.sessionState.isGeneratingReport}
      setIsRecording={props.sessionState.setIsRecording}
      isRecording={props.sessionState.isRecording}
      participantColors={props.participantColors}
      participantNames={{}}
      participants={props.participants}
      conversationId={props.currentConversationId}
      facilitator={props.conversation?.sessions?.facilitator_details || {}}
      objective={props.conversation?.sessions?.objective || ''}
      currentParticipantCount={props.conversation?.current_participants || 0}
      currentUserParticipantId={props.currentUserParticipantId}
      hasAnswered={props.sessionState.hasAnswered}
      totalResponses={props.sessionState.totalResponses}
      viewMode={props.sessionState.viewMode}
      setViewMode={props.sessionState.setViewMode}
      isAdmin={isAdmin}
      onSendAdminMessage={props.onSendAdminMessage}
      isAnonymous={props.anonymousState.isAnonymous}
      toggleAnonymous={props.anonymousState.toggleAnonymous}
    />
  );
};

export default SessionView;
