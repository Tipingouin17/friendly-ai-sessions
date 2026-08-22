/**
 * session
 *
 * Type definitions for the AIfacilitator application.
 */

import { Message, ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import type { UseStreamingFacilitatorRuntimeResult } from "@/hooks/facilitator/useStreamingFacilitatorRuntime";
import type { FacilitatorToolAssignment } from "@/types/facilitator";
import type { FacilitatorModeAssignment, ModeInput, ModeParticipantState, SessionActiveMode, SessionModeEvent } from "@/services/modeOrchestratorService";

export interface SessionContextProps {
  isLoading: boolean;
  conversation: ConversationWithSession | null;
  currentConversationId: number | null;
  sessionState: {
    messages: Message[];
    inputMessage: string;
    setInputMessage: (message: string) => void;
    currentParticipant: number;
    isRecording: boolean;
    setIsRecording: (isRecording: boolean) => void;
    handleGenerateReport: () => Promise<void>;
    isGeneratingReport: boolean;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    hasAnswered: boolean;
    totalResponses: number;
    viewMode: "participant" | "admin";
    setViewMode: (mode: "participant" | "admin") => void;
    recordResponse: (participantId: number, hasResponded: boolean) => void;
    error: string | null;
    enabledTools: FacilitatorToolAssignment[];
    isLoadingToolbox: boolean;
    toolboxError: string | null;
    toolboxInstruction?: string;
    enabledModes: FacilitatorModeAssignment[];
    activeMode: SessionActiveMode | null;
    participantModeState: ModeParticipantState | null;
    recentModeEvents: SessionModeEvent[];
    isLoadingModes: boolean;
    modeError: string | null;
    modeInstruction?: string;
    startMode: (params: {
      modeId: number;
      prompt?: string;
      options?: Record<string, unknown>;
      policy?: Record<string, unknown>;
      timerSeconds?: number;
    }) => Promise<unknown>;
    approveMode: (reason?: string) => Promise<unknown>;
    endMode: (reason?: string) => Promise<unknown>;
    rejectMode: (reason?: string) => Promise<unknown>;
    submitModeInput: (params: {
      inputType: string;
      content: Record<string, unknown>;
      visibility?: ModeInput["visibility"];
    }) => Promise<unknown>;
  };
  participants: ParticipantInfo[];
  participantColors: { [key: string]: string };
  isWaitingForResponse: boolean;
  handleStartSession: () => void;
  handleSendMessage: (messageOverride?: string) => Promise<void>;
  showQrCodeView: boolean;
  sessionLink: string;
  currentUserParticipantId: number | null;
  anonymousState: {
    isAnonymous: boolean;
    toggleAnonymous: () => void;
  };
  isSessionStartedInDB: boolean;
  error?: string | null;
  
  // Connection status properties
  isConnected: boolean;
  connectionAttempts: number;
  refetch: () => void;
  
  // Properties needed by SessionProviderWrapper
  isAdmin?: boolean;
  sessionStarted?: boolean;
  
  // Admin message function
  onSendAdminMessage?: (message: string) => void;

  // Feature-flagged stream-aware facilitator runtime. Optional by design so
  // existing session consumers remain compatible while the dev-only avatar
  // facilitator foundation is validated.
  facilitatorRuntime?: UseStreamingFacilitatorRuntimeResult;
  enabledTools?: FacilitatorToolAssignment[];
  isLoadingToolbox?: boolean;
  toolboxError?: string | null;
  toolboxInstruction?: string;
  enabledModes?: FacilitatorModeAssignment[];
  activeMode?: SessionActiveMode | null;
    participantModeState?: ModeParticipantState | null;
  recentModeEvents?: SessionModeEvent[];
  isLoadingModes?: boolean;
  modeError?: string | null;
  modeInstruction?: string;
  startMode?: (params: {
    modeId: number;
    prompt?: string;
    options?: Record<string, unknown>;
    policy?: Record<string, unknown>;
    timerSeconds?: number;
  }) => Promise<unknown>;
  approveMode?: (reason?: string) => Promise<unknown>;
  endMode?: (reason?: string) => Promise<unknown>;
  rejectMode?: (reason?: string) => Promise<unknown>;
  submitModeInput?: (params: {
    inputType: string;
    content: Record<string, unknown>;
    visibility?: ModeInput["visibility"];
  }) => Promise<unknown>;
}
