/**
 * Host Dashboard
 *
 * Session component for the AIfacilitator application.
 */

import React from "react";
import HostHeader from "./HostHeader";
import HostSessionContent from "./HostSessionContent";
import WaitingParticipantsBanner from "./WaitingParticipantsBanner";
import { EngagementStatsPanel } from "./EngagementStatsPanel";
import { Message, ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import type { FacilitatorToolAssignment } from "@/types/facilitator";
import type { FacilitatorModeAssignment, SessionActiveMode, SessionModeEvent } from "@/services/modeOrchestratorService";

interface HostDashboardProps {
  conversation: ConversationWithSession | null;
  isSessionPaused: boolean;
  toggleSessionState: () => void;
  sessionMessages: Message[];
  participantColors: { [key: string]: string };
  participants: ParticipantInfo[];
  isLoadingParticipants: boolean;
  currentConversationId: number | null;
  onSendMessage: (message: string, isPinned?: boolean, recipientId?: string) => void;
  
  // Response collection props
  isWaitingForResponses?: boolean;
  responseCount?: number;
  totalParticipants?: number;
  onTriggerFacilitatorResponse?: (hostInstruction?: string) => void;
  enabledTools?: FacilitatorToolAssignment[];
  isLoadingToolbox?: boolean;
  toolboxError?: string | null;
  enabledModes?: FacilitatorModeAssignment[];
  activeMode?: SessionActiveMode | null;
  recentModeEvents?: SessionModeEvent[];
  isLoadingModes?: boolean;
  modeError?: string | null;
  onStartMode?: (mode: FacilitatorModeAssignment, prompt?: string) => Promise<void>;
  onApproveMode?: (reason?: string) => Promise<void>;
  onEndMode?: (reason?: string) => Promise<void>;
  onRejectMode?: (reason?: string) => Promise<void>;
  
  // Session start props
  isSessionStarted?: boolean;
  onSessionStarted?: () => void;
  
  // Auto-start props
  isAutoStarting?: boolean;
  autoStartCountdown?: number;
  onCancelAutoStart?: () => void;

  // Session state
  isSessionEnded?: boolean;
}

const HostDashboard: React.FC<HostDashboardProps> = ({
  conversation,
  isSessionPaused,
  toggleSessionState,
  sessionMessages,
  participantColors,
  participants,
  isLoadingParticipants,
  currentConversationId,
  onSendMessage,
  isWaitingForResponses = false,
  responseCount = 0,
  totalParticipants = 1,
  onTriggerFacilitatorResponse,
  enabledTools = [],
  isLoadingToolbox = false,
  toolboxError = null,
  enabledModes = [],
  activeMode = null,
  recentModeEvents = [],
  isLoadingModes = false,
  modeError = null,
  onStartMode,
  onApproveMode,
  onEndMode,
  onRejectMode,
  isSessionStarted = false,
  onSessionStarted,
  isAutoStarting = false,
  autoStartCountdown = 0,
  onCancelAutoStart,
  isSessionEnded = false,
}) => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <HostHeader
        conversation={conversation}
        isSessionPaused={isSessionPaused}
        toggleSessionState={toggleSessionState}
        isSessionStarted={isSessionStarted}
      />

      {/* Waiting participants notification banner */}
      {currentConversationId && (
        <WaitingParticipantsBanner conversationId={currentConversationId} />
      )}

      {/* Live engagement stats (skip / pause / message-host events) */}
      {currentConversationId && isSessionStarted && (
        <div className="px-4 pt-2">
          <EngagementStatsPanel
            conversationId={currentConversationId}
            participants={participants.map(p => ({ id: Number(p.id), name: p.name }))}
          />
        </div>
      )}
      
      <HostSessionContent
        sessionMessages={sessionMessages}
        participantColors={participantColors}
        conversationData={conversation}
        participants={participants}
        isLoadingParticipants={isLoadingParticipants}
        currentConversationId={currentConversationId}
        onSendMessage={onSendMessage}
        isWaitingForResponses={isWaitingForResponses}
        responseCount={responseCount}
        totalParticipants={totalParticipants}
        onTriggerFacilitatorResponse={onTriggerFacilitatorResponse}
        enabledTools={enabledTools}
        isLoadingToolbox={isLoadingToolbox}
        toolboxError={toolboxError}
        enabledModes={enabledModes}
        activeMode={activeMode}
        recentModeEvents={recentModeEvents}
        isLoadingModes={isLoadingModes}
        modeError={modeError}
        onStartMode={onStartMode}
        onApproveMode={onApproveMode}
        onEndMode={onEndMode}
        onRejectMode={onRejectMode}
        isSessionStarted={isSessionStarted}
        onSessionStarted={onSessionStarted}
        isAutoStarting={isAutoStarting}
        autoStartCountdown={autoStartCountdown}
        onCancelAutoStart={onCancelAutoStart}
        isSessionEnded={isSessionEnded}
        isSessionPaused={isSessionPaused}
      />
    </div>
  );
};

export default HostDashboard;
