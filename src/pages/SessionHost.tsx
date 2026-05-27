/**
 * Session Host
 *
 * Page for the AIfacilitator application.
 */

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
    isWaitingRoomFull,

    // Messages
    sessionMessages,
    isSessionPaused,
    responseCount,
    isWaitingForResponses,

    // Actions
    toggleSessionState,
    handleSendHostMessage,
    triggerFacilitatorResponse,
    enabledTools,
    isLoadingToolbox,
    toolboxError,
    enabledModes,
    activeMode,
    recentModeEvents,
    isLoadingModes,
    modeError,
    startMode,
    approveMode,
    endMode,
    rejectMode,
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

  // ProtectedHostRoute already shows a unified loading screen while auth is
  // being verified and the host check is in progress. By the time SessionHost
  // mounts, the user is confirmed as an authenticated host. We therefore only
  // need a minimal guard here for the brief moment useSessionHostLogic is
  // still fetching data — rendered as a transparent pass-through so the
  // ProtectedHostRoute spinner remains visible without a second loading flash.
  if (isLoading && !hostViewReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your session...</p>
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
      enabledTools={enabledTools}
      isLoadingToolbox={isLoadingToolbox}
      toolboxError={toolboxError}
      enabledModes={enabledModes}
      activeMode={activeMode}
      recentModeEvents={recentModeEvents}
      isLoadingModes={isLoadingModes}
      modeError={modeError}
      onStartMode={startMode}
      onApproveMode={approveMode}
      onEndMode={endMode}
      onRejectMode={rejectMode}
      isSessionStarted={isSessionStarted}
      onSessionStarted={handleSessionStarted}
      isAutoStarting={isAutoStarting}
      autoStartCountdown={autoStartCountdown}
      onCancelAutoStart={cancelAutoStart}
      isWaitingRoomFull={isWaitingRoomFull}
      isSessionEnded={conversationData?.is_session_ended === true}
    />
  );
};

export default SessionHost;
