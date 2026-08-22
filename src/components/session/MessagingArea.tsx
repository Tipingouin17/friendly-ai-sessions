/**
 * Messaging Area
 *
 * Session component for the AIfacilitator application.
 */

import React, { useState, useEffect } from 'react';
import { Message, ParticipantInfo } from "@/types/chat";
import type { ConversationWithSession } from "@/types/database";
import type { UseStreamingFacilitatorRuntimeResult } from "@/hooks/facilitator/useStreamingFacilitatorRuntime";
import type { FacilitatorToolAssignment } from "@/types/facilitator";
import type { FacilitatorModeAssignment, ModeInput, ModeParticipantState, SessionActiveMode, SessionModeEvent } from "@/services/modeOrchestratorService";
import AdminMessagingView from "./messaging/AdminMessagingView";
import ParticipantMessagingView from "./messaging/ParticipantMessagingView";

interface MessagingAreaProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipant: number;
  isWaitingForResponse?: boolean;
  isWaitingForResponses?: boolean;
  responseCount?: number;
  totalParticipants?: number;
  participants: ParticipantInfo[];
  conversationId: number | null;
  currentParticipantCount: number;
  maxParticipants: number;
  isMobile: boolean;
  viewMode: "participant" | "admin";
  isAdmin: boolean;
  
  // Add props needed for input functionality
  inputMessage?: string;
  setInputMessage?: (message: string) => void;
  onSendMessage?: (messageOverride?: string) => Promise<void>;
  isRecording?: boolean;
  setIsRecording?: (isRecording: boolean) => void;
  isAnonymous?: boolean;
  toggleAnonymous?: () => void;
  hasAnswered?: boolean;
  totalResponses?: number;
  participantNames?: { [key: number]: string };
  currentUserParticipantId?: number | null;
  
  // Add conversationData prop to pass session info
  conversationData?: ConversationWithSession | null;
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

const MessagingArea = ({
  messages,
  participantColors,
  currentParticipant,
  isWaitingForResponse = false,
  isWaitingForResponses = false,
  responseCount = 0,
  totalParticipants = 1,
  participants,
  conversationId,
  currentParticipantCount,
  maxParticipants,
  isMobile,
  viewMode,
  isAdmin,
  
  // Input props with defaults
  inputMessage = '',
  setInputMessage = () => { /* no-op */ },
  onSendMessage = async () => { /* no-op */ },
  isRecording = false,
  setIsRecording = () => { /* no-op */ },
  isAnonymous = false,
  toggleAnonymous = () => { /* no-op */ },
  hasAnswered = false,
  totalResponses = 0,
  participantNames = { /* no-op */ },
  currentUserParticipantId = null,
  
  // Session data
  conversationData,
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
}: MessagingAreaProps) => {
  // State for admin filters and search
  const [showAnonymous, setShowAnonymous] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Force admin persistence
  useEffect(() => {
    if (isAdmin || viewMode === "admin") {
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [isAdmin, viewMode]);
  
  // Log messages count for debugging
  useEffect(() => {
    
    // Check if we're in participant view
    if (viewMode === "participant" && !isAdmin) {
      // Log participant filtering information for debugging
      const participantKey = String(currentParticipant);
      const userMsgCount = messages.filter(m => m.sender === "user" && m.participant === participantKey).length;
      const facilitatorMsgCount = messages.filter(m => m.sender === "assistant").length;
      const otherMsgCount = messages.length - userMsgCount - facilitatorMsgCount;
      
    }
  }, [messages, viewMode, isAdmin, currentParticipant]);
  
  // Always use admin view if isAdmin=true or viewMode is admin
  if (isAdmin || viewMode === "admin") {
    return (
      <AdminMessagingView
        messages={messages}
        participantColors={participantColors}
        currentParticipantCount={currentParticipantCount}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showAnonymous={showAnonymous}
        setShowAnonymous={setShowAnonymous}
      />
    );
  }

  // Default to participant view
  return (
    <ParticipantMessagingView
      messages={messages}
      participantColors={participantColors}
      currentParticipant={currentParticipant}
      isWaitingForResponse={isWaitingForResponse}
      isWaitingForResponses={isWaitingForResponses}
      responseCount={responseCount}
      totalParticipants={totalParticipants}
      participants={participants}
      conversationId={conversationId}
      currentParticipantCount={currentParticipantCount}
      maxParticipants={maxParticipants}
      isMobile={isMobile}
      conversationData={conversationData}
      
      // Pass input props to the participant view
      inputMessage={inputMessage}
      setInputMessage={setInputMessage}
      onSendMessage={onSendMessage}
      isRecording={isRecording}
      setIsRecording={setIsRecording}
      isAnonymous={isAnonymous}
      toggleAnonymous={toggleAnonymous}
      hasAnswered={hasAnswered}
      totalResponses={totalResponses}
      viewMode={viewMode}
      participantNames={participantNames}
      currentUserParticipantId={currentUserParticipantId}
      showResponseStats={false}
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
  );
};

export default React.memo(MessagingArea);
