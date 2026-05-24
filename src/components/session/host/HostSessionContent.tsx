/**
 * Host Session Content
 *
 * Session component for the AIfacilitator application.
 */

import React from "react";
import SimplifiedHostMessagingView from "@/components/session/messaging/SimplifiedHostMessagingView";
import HostParticipantList from "@/components/session/HostParticipantList";
import { Message, ParticipantInfo } from "@/types/chat";
import type { ConversationWithSession } from "@/types/database";
import type { FacilitatorToolAssignment } from "@/types/facilitator";
import type { FacilitatorModeAssignment, SessionActiveMode, SessionModeEvent } from "@/services/modeOrchestratorService";

interface HostSessionContentProps {
  sessionMessages: Message[];
  participantColors: { [key: string]: string };
  conversationData: ConversationWithSession | null;
  participants: ParticipantInfo[];
  isLoadingParticipants: boolean;
  currentConversationId: number | null;
  onSendMessage?: (message: string, isPinned: boolean, recipientId?: string) => void;
  
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
  isSessionPaused?: boolean;
}

const HostSessionContent: React.FC<HostSessionContentProps> = ({
  sessionMessages,
  participantColors,
  conversationData,
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
  isSessionPaused = false,
}) => {
  // Use actual participant count from real-time data
  const actualParticipantCount = participants.length;

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-100">
      {/* Main intelligence panel */}
      <div className="flex-1 overflow-hidden bg-white m-3 mr-0 rounded-l-2xl border border-slate-200 shadow-sm">
        <SimplifiedHostMessagingView
          messages={sessionMessages || []}
          participantColors={participantColors}
          currentParticipantCount={actualParticipantCount}
          conversationData={conversationData}
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
          participants={participants}
          conversationId={currentConversationId}
          isAutoStarting={isAutoStarting}
          autoStartCountdown={autoStartCountdown}
          onCancelAutoStart={onCancelAutoStart}
          isSessionEnded={isSessionEnded}
          isSessionPaused={isSessionPaused}
        />
      </div>

      {/* Participant sidebar */}
      <HostParticipantList
        participants={participants || []}
        currentParticipantCount={actualParticipantCount}
        maxParticipants={conversationData?.participants || 10}
        isLoading={isLoadingParticipants}
        conversationData={conversationData}
        messages={sessionMessages}
        onSendMessage={onSendMessage}
      />
    </div>
  );
};

export default HostSessionContent;
