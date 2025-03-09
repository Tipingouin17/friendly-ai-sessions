
import React, { createContext, useContext, useMemo } from 'react';
import { SessionContextProps } from "@/types/session";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { useSessionContext } from "@/hooks/useSessionContext";
import { useSessionErrorBoundary } from "@/hooks/useSessionErrorBoundary";
import { useSessionParticipantContext } from "@/hooks/useSessionParticipantContext";
import { useSessionLogger } from "@/hooks/useSessionLogger";
import { participantColors } from "@/utils/sessionHelpers";

// Context type definition
type SessionStateContextType = {
  sessionContext: SessionContextProps;
  isAdmin: boolean;
  setSessionStarted: (started: boolean) => void;
};

// Create context
const SessionStateContext = createContext<SessionStateContextType | null>(null);

// Props for provider
interface SessionStateProviderProps {
  children: React.ReactNode;
  sessionData: SessionContextProps;
  isAdmin: boolean;
  onSessionFull?: () => void;
  onError?: (error: string) => void;
}

export const SessionStateProvider: React.FC<SessionStateProviderProps> = ({
  children,
  sessionData,
  isAdmin,
  onSessionFull,
  onError
}) => {
  // Set up session context
  const {
    isSessionActive,
    setIsSessionActive,
    error: contextError,
    setError: setContextError
  } = useSessionContext({
    conversation: sessionData.conversation,
    currentConversationId: sessionData.currentConversationId,
    sessionState: sessionData.sessionState,
    isSessionStartedInDB: sessionData.isSessionStartedInDB,
    onError
  });
  
  // Set up participant context
  const participantContext = useSessionParticipantContext({
    conversation: sessionData.conversation,
    participants: sessionData.participants,
    currentUserParticipantId: sessionData.currentUserParticipantId
  });
  
  // Set up error boundary
  const {
    boundaryError,
    handleError
  } = useSessionErrorBoundary({
    onError,
    initialError: contextError || sessionData.error || null
  });
  
  // Enable logging for debugging
  useSessionLogger({
    currentConversationId: sessionData.currentConversationId,
    conversation: sessionData.conversation,
    isLoading: sessionData.isLoading,
    messages: sessionData.sessionState.messages,
    participants: sessionData.participants,
    isSessionStartedInDB: sessionData.isSessionStartedInDB,
    error: boundaryError
  });
  
  // Check if session is full and trigger callback
  React.useEffect(() => {
    if (participantContext.isSessionFull && onSessionFull) {
      onSessionFull();
    }
  }, [participantContext.isSessionFull, onSessionFull]);
  
  // Create enhanced session context with combined state
  const enhancedSessionContext = useMemo(() => ({
    ...sessionData,
    error: boundaryError,
    isSessionFull: participantContext.isSessionFull,
    participantContext
  }), [sessionData, boundaryError, participantContext]);
  
  // Create session state context value
  const contextValue = useMemo(() => ({
    sessionContext: enhancedSessionContext as SessionContextProps,
    isAdmin,
    setSessionStarted: setIsSessionActive
  }), [enhancedSessionContext, isAdmin, setIsSessionActive]);
  
  return (
    <SessionStateContext.Provider value={contextValue}>
      {children}
    </SessionStateContext.Provider>
  );
};

// Custom hook to use the session state context
export const useSessionState = () => {
  const context = useContext(SessionStateContext);
  if (!context) {
    throw new Error('useSessionState must be used within a SessionStateProvider');
  }
  return context;
};
