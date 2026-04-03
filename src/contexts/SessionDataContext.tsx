/**
 * Session Data Context
 *
 * Context for the AIfacilitator application.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ConversationWithSession } from "@/types/database";
import { ParticipantInfo } from "@/types/chat";
import { useSessionData } from "@/hooks/useSessionData";
import { useSessionParticipantManager } from "@/hooks/useSessionParticipantManager";
import { useSessionLogger } from "@/hooks/useSessionLogger";
import { useSessionErrorBoundary } from "@/hooks/useSessionErrorBoundary";
import { useSessionStartMonitor } from "@/hooks/useSessionStartMonitor";
import { LocationStateType } from "@/hooks/useConversationId";

// Context type definition
interface SessionDataContextType {
  // Basic session data
  conversation: ConversationWithSession | null;
  currentConversationId: number | null;
  locationState: LocationStateType | null;
  isLoading: boolean;
  error: string | null;

  // Participant data
  participants: ParticipantInfo[];
  currentUserParticipantId: number | null;
  currentParticipantCount: number;
  maxParticipantsForSession: number;
  isSessionFull: boolean;

  // Session status
  isSessionStartedInDB: boolean;
  showQrCodeView: boolean;
  sessionLink: string;

  // Actions
  refetch: () => void;
  handleStartSession: () => void;
  setError: (error: string) => void;
  clearError: () => void;
}

// Create context
const SessionDataContext = createContext<SessionDataContextType | null>(null);

// Provider props
interface SessionDataProviderProps {
  children: React.ReactNode;
  onError?: (error: string) => void;
  onSessionFull?: () => void;
}

// Provider component
export const SessionDataProvider: React.FC<SessionDataProviderProps> = ({
  children,
  onError,
  onSessionFull
}) => {
  // Load session data
  const sessionData = useSessionData();

  // Set up session start monitoring
  const isSessionStartedInDB = useSessionStartMonitor({
    conversation: sessionData.conversation
  });

  // Set up participant management
  const participantManager = useSessionParticipantManager({
    conversationId: sessionData.currentConversationId,
    conversation: sessionData.conversation,
    locationState: sessionData.locationState,
    refetch: sessionData.refetch,
    onSessionFull
  });

  // Set up error boundary
  const {
    boundaryError,
    handleError,
    clearError
  } = useSessionErrorBoundary({
    onError,
    initialError: sessionData.error || participantManager.error || null
  });

  // Log important state for debugging
  useSessionLogger({
    currentConversationId: sessionData.currentConversationId,
    conversation: sessionData.conversation,
    isLoading: sessionData.isLoading,
    messages: [], // We don't have messages at this level
    participants: participantManager.participants,
    isSessionStartedInDB,
    error: boundaryError
  });

  // Create context value
  const contextValue: SessionDataContextType = {
    // Session data
    conversation: sessionData.conversation,
    currentConversationId: sessionData.currentConversationId,
    locationState: sessionData.locationState,
    isLoading: sessionData.isLoading,
    error: boundaryError,

    // Participant data
    participants: participantManager.participants,
    currentUserParticipantId: participantManager.currentUserParticipantId,
    currentParticipantCount: participantManager.currentParticipantCount,
    maxParticipantsForSession: participantManager.maxParticipantsForSession,
    isSessionFull: participantManager.isSessionFull,

    // Session status
    isSessionStartedInDB,
    showQrCodeView: sessionData.showQrCodeView,
    sessionLink: sessionData.sessionLink,

    // Actions
    refetch: sessionData.refetch,
    handleStartSession: sessionData.handleStartSession,
    setError: handleError,
    clearError
  };

  return (
    <SessionDataContext.Provider value={contextValue}>
      {children}
    </SessionDataContext.Provider>
  );
};

// Custom hook to use the session data context
export const useSessionDataContext = () => {
  const context = useContext(SessionDataContext);
  if (!context) {
    throw new Error('useSessionDataContext must be used within a SessionDataProvider');
  }
  return context;
};
