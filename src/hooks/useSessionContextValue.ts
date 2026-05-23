/**
 * use Session Context Value
 *
 * Hook for the AIfacilitator application.
 */

import { useMemo } from "react";
import { SessionContextProps } from "@/types/session";
import type { UseStreamingFacilitatorRuntimeResult } from "@/hooks/facilitator/useStreamingFacilitatorRuntime";
import type { Message, ParticipantInfo } from "@/types/chat";
import type { ConversationWithSession } from "@/types/database";
import { participantColors } from "@/utils/sessionHelpers";

type RoomState = Partial<SessionContextProps["sessionState"]> & {
  anonymousState?: SessionContextProps["anonymousState"];
  isWaitingForResponse?: boolean;
  handleSendMessage?: () => Promise<void>;
};

interface ConnectionState {
  isConnected?: boolean;
  connectionAttempts?: number;
}

interface UseSessionContextValueProps {
  isLoading: boolean;
  conversation: ConversationWithSession | null;
  currentConversationId: number | null;
  refetch: () => void;
  showQrCodeView: boolean;
  sessionLink: string | null;
  isSessionStartedInDB: boolean;
  roomState: RoomState | null;
  participants: ParticipantInfo[];
  currentUserParticipantId: number | null;
  isAdmin: boolean;
  providerError: string | null;
  connection: ConnectionState | null;
  handleStartSession: () => void;
  effectiveAdmin: boolean;
  facilitatorRuntime?: UseStreamingFacilitatorRuntimeResult;
}

export function useSessionContextValue({
  isLoading,
  conversation,
  currentConversationId,
  refetch,
  showQrCodeView,
  sessionLink,
  isSessionStartedInDB,
  roomState,
  participants,
  currentUserParticipantId,
  isAdmin,
  providerError,
  connection,
  handleStartSession,
  effectiveAdmin,
  facilitatorRuntime
}: UseSessionContextValueProps): SessionContextProps {
  // Create safe defaults for any potentially undefined values
  const safeRoomState = useMemo(() => roomState || {
    messages: [],
    inputMessage: "",
    setInputMessage: () => { /* no-op */ },
    currentParticipant: 0,
    isRecording: false,
    setIsRecording: () => { /* no-op */ },
    handleGenerateReport: async () => Promise.resolve(),
    isGeneratingReport: false,
    setMessages: () => { /* no-op */ },
    hasAnswered: false,
    totalResponses: 0,
    viewMode: "participant",
    setViewMode: () => { /* no-op */ },
    recordResponse: () => { /* no-op */ },
    error: null,
    enabledTools: [],
    isLoadingToolbox: false,
    toolboxError: null,
    toolboxInstruction: undefined,
    enabledModes: [],
    activeMode: null,
    participantModeState: null,
    isLoadingModes: false,
    modeError: null,
    modeInstruction: undefined,
    recentModeEvents: [],
    startMode: async () => Promise.resolve(),
    endMode: async () => Promise.resolve(),
    rejectMode: async () => Promise.resolve(),
    submitModeInput: async () => Promise.resolve()
  }, [roomState]);

  // Create session state object separately to avoid re-creating on every render
  const sessionState = useMemo(() => ({
    messages: safeRoomState.messages || [],
    inputMessage: safeRoomState.inputMessage || "",
    setInputMessage: safeRoomState.setInputMessage || (() => { /* no-op */ }),
    currentParticipant: safeRoomState.currentParticipant || 0,
    isRecording: safeRoomState.isRecording || false,
    setIsRecording: safeRoomState.setIsRecording || (() => { /* no-op */ }),
    handleGenerateReport: safeRoomState.handleGenerateReport || (async () => Promise.resolve()),
    isGeneratingReport: safeRoomState.isGeneratingReport || false,
    setMessages: safeRoomState.setMessages || (() => { /* no-op */ }),
    hasAnswered: safeRoomState.hasAnswered || false,
    totalResponses: safeRoomState.totalResponses || 0,
    viewMode: safeRoomState.viewMode || "participant",
    setViewMode: safeRoomState.setViewMode || (() => { /* no-op */ }),
    recordResponse: safeRoomState.recordResponse || (() => { /* no-op */ }),
    error: safeRoomState.error || null,
    enabledTools: safeRoomState.enabledTools || [],
    isLoadingToolbox: safeRoomState.isLoadingToolbox || false,
    toolboxError: safeRoomState.toolboxError || null,
    toolboxInstruction: safeRoomState.toolboxInstruction,
    enabledModes: safeRoomState.enabledModes || [],
    activeMode: safeRoomState.activeMode || null,
    participantModeState: safeRoomState.participantModeState || null,
    isLoadingModes: safeRoomState.isLoadingModes || false,
    modeError: safeRoomState.modeError || null,
    modeInstruction: safeRoomState.modeInstruction,
    recentModeEvents: safeRoomState.recentModeEvents || [],
    startMode: safeRoomState.startMode || (async () => Promise.resolve()),
    endMode: safeRoomState.endMode || (async () => Promise.resolve()),
    rejectMode: safeRoomState.rejectMode || (async () => Promise.resolve()),
    submitModeInput: safeRoomState.submitModeInput || (async () => Promise.resolve())
  }), [safeRoomState]);

  // Create anonymous state object separately
  const anonymousState = useMemo(() => safeRoomState.anonymousState || {
    isAnonymous: false,
    toggleAnonymous: () => { /* no-op */ }
  }, [safeRoomState]);

  // Create connection properties separately
  const connectionProps = useMemo(() => ({
    isConnected: connection?.isConnected || false,
    connectionAttempts: connection?.connectionAttempts || 0
  }), [connection]);

  // When a participant first arrives at an active session with no messages yet,
  // treat it as "waiting for the AI" so MessageList shows the ThinkingIndicator
  // immediately instead of the generic "No messages yet" empty state.
  const isWaitingForFirstMessage = useMemo(() => {
    if (isAdmin || effectiveAdmin) return false;
    const msgs: Message[] = safeRoomState.messages || [];
    const isActive = conversation && !conversation.is_session_ended && conversation.status === 'active';
    return isActive && msgs.length === 0;
  }, [isAdmin, effectiveAdmin, safeRoomState.messages, conversation]);

  // In multi-participant sessions, after a participant sends their answer, show the
  // ThinkingIndicator while waiting for all other participants to respond and the AI
  // to generate its aggregated reply. The participant-side no longer invokes AI directly,
  // so isWaitingForResponse from useMessageSender stays false. We derive this state
  // from the messages: if the last message is from a user (not assistant), the participant
  // is waiting for the AI to respond.
  const isWaitingForOtherParticipants = useMemo(() => {
    if (isAdmin || effectiveAdmin) return false;
    if (!currentUserParticipantId) return false;
    const msgs: Message[] = safeRoomState.messages || [];
    if (msgs.length === 0) return false;
    const isActive = conversation && !conversation.is_session_ended && conversation.status === 'active';
    if (!isActive) return false;
    // Find the last assistant message index
    let lastAssistantIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].sender === 'assistant') { lastAssistantIdx = i; break; }
    }
    const lastMsg = msgs[msgs.length - 1];
    // No assistant message yet: if the participant already sent a message and the last
    // message is still from a user, they are waiting for the AI's first response.
    if (lastAssistantIdx === -1) {
      const hasUserMsg = msgs.some(
        (m: Message) => m.sender === 'user' && m.participant === String(currentUserParticipantId)
      );
      return hasUserMsg && lastMsg.sender !== 'assistant';
    }
    // Check if the current participant has answered after the last assistant message
    const hasAnsweredThisRound = msgs.slice(lastAssistantIdx + 1).some(
      (m: Message) => m.sender === 'user' && m.participant === String(currentUserParticipantId)
    );
    // If the participant has answered but the last message is not from the assistant,
    // they are waiting for other participants and/or the AI response.
    return hasAnsweredThisRound && lastMsg.sender !== 'assistant';
  }, [isAdmin, effectiveAdmin, currentUserParticipantId, safeRoomState.messages, conversation]);

  // Create the session context value with safe defaults and proper memoization
  return useMemo<SessionContextProps>(() => ({
    // When currentConversationId is null, TanStack Query v5 sets enabled:false and
    // returns isLoading=false immediately. We must treat this as "still loading" so
    // SessionStateRenderer doesn't fire the "No conversation ID found" error branch.
    isLoading: effectiveAdmin ? false : (isLoading || !currentConversationId),
    conversation,
    currentConversationId,
    sessionState,
    participants: participants || [],
    participantColors,
    isWaitingForResponse: safeRoomState.isWaitingForResponse || isWaitingForFirstMessage || isWaitingForOtherParticipants || false,
    handleStartSession: handleStartSession || (() => { /* no-op */ }),
    handleSendMessage: safeRoomState.handleSendMessage || (async () => Promise.resolve()),
    showQrCodeView: showQrCodeView || false,
    sessionLink: sessionLink || '',
    currentUserParticipantId,
    anonymousState,
    isSessionStartedInDB,
    refetch,
    error: providerError,
    facilitatorRuntime,
    enabledTools: safeRoomState.enabledTools || [],
    isLoadingToolbox: safeRoomState.isLoadingToolbox || false,
    toolboxError: safeRoomState.toolboxError || null,
    toolboxInstruction: safeRoomState.toolboxInstruction,
    enabledModes: safeRoomState.enabledModes || [],
    activeMode: safeRoomState.activeMode || null,
    participantModeState: safeRoomState.participantModeState || null,
    isLoadingModes: safeRoomState.isLoadingModes || false,
    modeError: safeRoomState.modeError || null,
    modeInstruction: safeRoomState.modeInstruction,
    recentModeEvents: safeRoomState.recentModeEvents || [],
    startMode: safeRoomState.startMode,
    endMode: safeRoomState.endMode,
    rejectMode: safeRoomState.rejectMode,
    submitModeInput: safeRoomState.submitModeInput,
    ...connectionProps
  }), [
    isLoading,
    conversation,
    currentConversationId,
    sessionState,
    participants,
    safeRoomState.isWaitingForResponse,
    safeRoomState.enabledTools,
    safeRoomState.isLoadingToolbox,
    safeRoomState.toolboxError,
    safeRoomState.toolboxInstruction,
    safeRoomState.enabledModes,
    safeRoomState.activeMode,
    safeRoomState.participantModeState,
    safeRoomState.isLoadingModes,
    safeRoomState.modeError,
    safeRoomState.modeInstruction,
    safeRoomState.recentModeEvents,
    safeRoomState.startMode,
    safeRoomState.endMode,
    safeRoomState.rejectMode,
    safeRoomState.submitModeInput,
    isWaitingForFirstMessage,
    isWaitingForOtherParticipants,
    handleStartSession,
    safeRoomState.handleSendMessage,
    showQrCodeView,
    sessionLink,
    currentUserParticipantId,
    anonymousState,
    isSessionStartedInDB,
    providerError,
    connectionProps,
    refetch,
    effectiveAdmin,
    facilitatorRuntime
  ]);
}
