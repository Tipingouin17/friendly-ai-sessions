/**
 * Session Container
 *
 * Session component for the AIfacilitator application.
 */

import React, { useEffect } from "react";
import MessagingArea from "./MessagingArea";
import { Message, ParticipantInfo } from "@/types/chat";
import type { ConversationWithSession, DbFacilitator } from "@/types/database";
import type { UseStreamingFacilitatorRuntimeResult } from "@/hooks/facilitator/useStreamingFacilitatorRuntime";
import type { FacilitatorToolAssignment } from "@/types/facilitator";
import type { FacilitatorModeAssignment, ModeInput, ModeParticipantState, SessionActiveMode, SessionModeEvent } from "@/services/modeOrchestratorService";
import { getParticipantColor } from "@/utils/sessionHelpers";
import InputFooter from "./InputFooter";
import { useIsMobile } from "@/hooks/use-mobile";

interface SessionContainerProps {
  participantCount: number;
  conversation: ConversationWithSession | null;
  messages: Message[];
  inputMessage: string;
  setInputMessage: (message: string) => void;
  currentParticipant: number;
  handleSendMessage: (messageOverride?: string) => Promise<void>; // renamed from onSendMessage for clarity
  onGenerateReport: () => void;
  isGeneratingReport: boolean;
  isWaitingForResponse: boolean;
  isWaitingForResponses?: boolean;
  responseCount?: number;
  totalParticipants?: number;
  setIsRecording: (isRecording: boolean) => void;
  isRecording: boolean;
  participantColors: { [key: string]: string };
  participantNames: { [key: number]: string };
  participants: ParticipantInfo[];
  conversationId: number | null;
  facilitator: DbFacilitator | null;
  objective: string;
  currentParticipantCount: number;
  currentUserParticipantId: number | null;
  hasAnswered: boolean;
  totalResponses: number;
  viewMode: "participant" | "admin";
  setViewMode: (mode: "participant" | "admin") => void;
  isAdmin: boolean;
  onSendAdminMessage?: (message: string) => void;
  isAnonymous?: boolean;
  toggleAnonymous?: () => void;
  facilitatorRuntime?: UseStreamingFacilitatorRuntimeResult;
  enabledTools?: FacilitatorToolAssignment[];
  isLoadingToolbox?: boolean;
  enabledModes?: FacilitatorModeAssignment[];
  activeMode?: SessionActiveMode | null;
  participantModeState?: ModeParticipantState | null;
  recentModeEvents?: SessionModeEvent[];
  isLoadingModes?: boolean;
  modeError?: string | null;
  submitModeInput?: (params: {
    inputType: string;
    content: Record<string, unknown>;
    visibility?: ModeInput["visibility"];
  }) => Promise<unknown>;
}

const SessionContainer: React.FC<SessionContainerProps> = ({
  participantCount,
  conversation,
  messages,
  inputMessage,
  setInputMessage,
  currentParticipant,
  handleSendMessage, // use handleSendMessage instead of onSendMessage
  onGenerateReport,
  isGeneratingReport,
  isWaitingForResponse,
  isWaitingForResponses = false,
  responseCount = 0,
  totalParticipants = 1,
  setIsRecording,
  isRecording,
  participantColors,
  participantNames,
  participants,
  conversationId,
  facilitator,
  objective,
  currentParticipantCount,
  currentUserParticipantId,
  hasAnswered,
  totalResponses,
  viewMode,
  setViewMode,
  isAdmin,
  onSendAdminMessage,
  isAnonymous = false,
  toggleAnonymous = () => { /* no-op */ },
  facilitatorRuntime,
  enabledTools = [],
  isLoadingToolbox = false,
  enabledModes = [],
  activeMode = null,
  participantModeState = null,
  recentModeEvents = [],
  isLoadingModes = false,
  modeError = null,
  submitModeInput
}) => {
  const mobileState = useIsMobile();
  const isMobile = mobileState === true;
  
  // Combined participant names from props
  const allParticipantNames = { ...participantNames };
  
  // Calculate participant colors if needed
  const enhancedParticipantColors = { ...participantColors };
  participants.forEach(p => {
    const key = String(p.id);
    if (!enhancedParticipantColors[key]) {
      enhancedParticipantColors[key] = getParticipantColor(key);
    }
  });
  
  // Debug logging for messages
  useEffect(() => { /* no-op */ }, [messages.length, currentParticipant, hasAnswered]);

  // conversations.participants includes the host. Participant-facing capacity is
  // attendee-only, consistent with join, waiting-room, and host seat displays.
  const attendeeCapacity = Math.max(1, participantCount - 1);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gray-50">
      {/* The participant route owns the fixed-header safe-area offset. Keep this
          container neutral so nested mobile panels cannot drift under the header. */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <MessagingArea
          messages={messages}
          participantColors={enhancedParticipantColors}
          currentParticipant={currentParticipant}
          isWaitingForResponse={isWaitingForResponse}
          isWaitingForResponses={isWaitingForResponses}
          responseCount={responseCount}
          totalParticipants={totalParticipants}
          participants={participants}
          conversationId={conversationId}
          currentParticipantCount={currentParticipantCount}
          maxParticipants={attendeeCapacity}
          isMobile={isMobile}
          viewMode={viewMode}
          isAdmin={isAdmin}
          conversationData={conversation}
          
          // Pass input functionality props
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSendMessage={handleSendMessage} // fixed: use correct handler
          isRecording={isRecording}
          setIsRecording={setIsRecording}
          isAnonymous={isAnonymous}
          toggleAnonymous={toggleAnonymous}
          hasAnswered={hasAnswered}
          totalResponses={totalResponses}
          participantNames={allParticipantNames}
          currentUserParticipantId={currentUserParticipantId}
          facilitatorRuntime={facilitatorRuntime}
          enabledTools={enabledTools}
          isLoadingToolbox={isLoadingToolbox}
          enabledModes={enabledModes}
          activeMode={activeMode}
          participantModeState={participantModeState}
          recentModeEvents={recentModeEvents}
          isLoadingModes={isLoadingModes}
          modeError={modeError}
          submitModeInput={submitModeInput}
        />
      </div>
    </div>
  );
};

export default SessionContainer;
