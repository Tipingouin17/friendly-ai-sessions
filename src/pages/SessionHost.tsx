
import React, { useMemo } from "react";
import HostDashboard from "@/components/session/host/HostDashboard";
import { getParticipantColor } from "@/utils/sessionHelpers";
import { useSessionHostLogic } from "@/hooks/useSessionHostLogic";

const SessionHost = () => {
  const {
    // State
    isLoading,
    hostViewReady,
    conversationData,
    currentConversationId,

    // Participants
    participants,
    participantCount,
    isLoadingParticipants,

    // Session Status
    isSessionStarted,
    isAutoStarting,
    autoStartCountdown,
    cancelAutoStart,

    // Messages
    sessionMessages,
    isSessionPaused,
    responseCount,
    isWaitingForResponses,

    // Actions
    toggleSessionState,
    handleSendHostMessage,
    triggerFacilitatorResponse,
    handleSessionStarted,
    refresh
  } = useSessionHostLogic();

  // Generate participant colors mapping
  const participantColors = useMemo(() => {
    return (participants || []).reduce((colors, participant) => {
      colors[String(participant.id)] = getParticipantColor(String(participant.id));
      return colors;
    }, { /* no-op */ } as { [key: string]: string });
  }, [participants]);

  // Show loading state only if we're not ready
  if (isLoading && !hostViewReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Initializing host session...</p>
        </div>
      </div>
    );
  }

  return (
    <HostDashboard
      conversation={conversationData}
      isSessionPaused={isSessionPaused}
      toggleSessionState={toggleSessionState}
      sessionMessages={sessionMessages}
      participantColors={participantColors}
      participants={participants || []}
      isLoadingParticipants={isLoadingParticipants}
      currentConversationId={currentConversationId}
      onSendMessage={handleSendHostMessage}
      isWaitingForResponses={isWaitingForResponses}
      responseCount={responseCount}
      totalParticipants={participantCount}
      onTriggerFacilitatorResponse={triggerFacilitatorResponse}
      isSessionStarted={isSessionStarted}
      onSessionStarted={handleSessionStarted}
      isAutoStarting={isAutoStarting}
      autoStartCountdown={autoStartCountdown}
      onCancelAutoStart={cancelAutoStart}
    />
  );
};

export default SessionHost;
