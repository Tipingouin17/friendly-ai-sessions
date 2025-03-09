
import React from "react";
import { useLocation } from "react-router-dom";
import { useSessionState } from "@/hooks/useSessionState";
import { useSessionData } from "@/hooks/useSessionData";
import { useSessionRealtime } from "@/hooks/useSessionRealtime";
import { useSessionInteractions } from "@/hooks/useSessionInteractions";
import { useAnonymousState } from "@/hooks/useAnonymousState";
import { participantColors } from "@/utils/sessionHelpers";
import { SessionContextProps } from "@/types/session";
import { useSessionErrorHandler } from "@/hooks/useSessionErrorHandler";
import { useCurrentParticipant } from "@/hooks/useCurrentParticipant";
import { useSessionStartMonitor } from "@/hooks/useSessionStartMonitor";
import { SessionProviderErrorFallback } from "./SessionProviderErrorFallback";

interface SessionProviderProps {
  children: (props: SessionContextProps) => React.ReactElement;
  handleSessionFull?: () => void;
  onError?: (error: string) => void;
}

export const SessionProvider = ({ children, handleSessionFull, onError }: SessionProviderProps) => {
  const location = useLocation();
  const locationState = location.state as { 
    participantId?: number; 
    isGuest?: boolean; 
    participantName?: string;
    showMessaging?: boolean 
  } | null;
  
  // Set up error handling
  const { providerError, handleError } = useSessionErrorHandler({ onError });
  
  // Wrap data fetching in try-catch to prevent unhandled errors
  try {
    // Fetch session data
    const {
      currentConversationId,
      participants,
      setParticipants,
      sessionLink,
      showQrCodeView,
      conversation,
      isLoading: dataLoading,
      refetch,
      handleStartSession,
      error: dataError
    } = useSessionData();

    // Monitor for session start status
    const isSessionStartedInDB = useSessionStartMonitor({ conversation });

    // Log important data for debugging
    console.log("SessionProvider - conversation data:", conversation);
    console.log("SessionProvider - currentConversationId:", currentConversationId);
    console.log("SessionProvider - isLoading:", dataLoading);
    
    // Handle data errors
    React.useEffect(() => {
      if (dataError) {
        console.error("Session data error:", dataError.message);
        handleError(dataError.message);
      }
    }, [dataError, handleError]);

    // Get current participant ID
    const currentUserParticipantId = useCurrentParticipant({ 
      locationState, 
      conversation 
    });

    // Set up realtime updates for participants
    const { error: realtimeError } = useSessionRealtime({
      currentConversationId,
      participants,
      setParticipants,
      conversation,
      refetch,
      handleSessionFull,
      onSessionStarted: () => {
        console.log("Session started event received from realtime updates");
        // This is handled by the useSessionStartMonitor now, which will
        // update when session_started changes in the conversation data
      }
    });

    // Handle realtime errors
    React.useEffect(() => {
      if (realtimeError) {
        console.error("Session realtime error:", realtimeError);
        handleError(realtimeError);
      }
    }, [realtimeError, handleError]);

    // Set up session state
    const sessionState = useSessionState({
      conversationId: currentConversationId,
      welcomeMessage: conversation?.sessions?.welcome_message ?? null,
      currentUserParticipantId
    });

    // Handle session state errors
    React.useEffect(() => {
      if (sessionState.error) {
        console.error("Session state error:", sessionState.error);
        handleError(sessionState.error);
      }
    }, [sessionState.error, handleError]);

    // Set up anonymous state
    const anonymousState = useAnonymousState({
      conversationId: currentConversationId,
      currentParticipantId: currentUserParticipantId
    });

    // Set up message handling and interactions
    const {
      isWaitingForResponse,
      handleSendMessage,
      handleLikeMessage,
      error: interactionsError
    } = useSessionInteractions({
      currentConversationId,
      sessionState,
      conversation,
      participants,
      isAnonymous: anonymousState.isAnonymous
    });

    // Handle interactions errors
    React.useEffect(() => {
      if (interactionsError) {
        console.error("Session interactions error:", interactionsError);
        handleError(interactionsError);
      }
    }, [interactionsError, handleError]);

    // If we have serious errors, return early with error handling
    if (providerError) {
      return (
        <SessionProviderErrorFallback errorMessage={providerError}>
          {children}
        </SessionProviderErrorFallback>
      );
    }

    // Build session context with all the data and handlers
    const sessionContext: SessionContextProps = {
      isLoading: dataLoading,
      conversation,
      currentConversationId,
      sessionState,
      participants,
      participantColors,
      isWaitingForResponse,
      handleStartSession,
      handleSendMessage,
      handleLikeMessage,
      showQrCodeView,
      sessionLink,
      currentUserParticipantId,
      anonymousState,
      isSessionStartedInDB,
      
      // Add required properties that were missing
      isConnected: true, // Default to true since we're not tracking connection status here
      connectionAttempts: 0, // Default to 0 since we're not tracking connection attempts here
      refetch // Pass the refetch function from useSessionData
    };

    // Provide error if we have one
    if (providerError) {
      sessionContext.error = providerError;
    }

    // Return children with context
    return children(sessionContext);
  } catch (unexpectedError) {
    // Catch any unexpected errors to prevent blank screen
    console.error("Unexpected error in SessionProvider:", unexpectedError);
    const errorMessage = unexpectedError instanceof Error ? unexpectedError.message : "An unexpected error occurred";
    handleError(errorMessage);
    
    // Return error fallback component
    return (
      <SessionProviderErrorFallback errorMessage={errorMessage}>
        {children}
      </SessionProviderErrorFallback>
    );
  }
};
