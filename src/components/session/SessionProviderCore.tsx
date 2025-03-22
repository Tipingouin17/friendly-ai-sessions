
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SessionContextProps } from "@/types/session";
import { SessionProviderErrorFallback } from "./SessionProviderErrorFallback";
import { useSessionProviderState } from "@/hooks/useSessionProviderState";
import { useSessionParticipantSetup } from "@/hooks/useSessionParticipantSetup";
import { useSessionMonitoring } from "@/hooks/useSessionMonitoring";
import { useToast } from "@/components/ui/use-toast";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";
import { useSessionRealtimeConnection } from "@/hooks/useSessionRealtimeConnection";
import { useSessionContextValue } from "@/hooks/useSessionContextValue";

interface SessionProviderCoreProps {
  children: (props: SessionContextProps) => React.ReactElement;
  handleSessionFull?: () => void;
  onError?: (error: string) => void;
  forceAdmin?: boolean;
}

export const SessionProviderCore = ({ 
  children, 
  handleSessionFull, 
  onError,
  forceAdmin 
}: SessionProviderCoreProps) => {
  const location = useLocation();
  const { toast } = useToast();
  const { persistedParticipantData } = useParticipantPersistence();
  
  // Debug logging
  useEffect(() => {
    console.log("SessionProviderCore initialized", {
      pathname: location.pathname,
      search: location.search,
      hasLocationState: !!location.state,
      hasPersistedData: !!persistedParticipantData,
      forceAdmin,
      isAdminInStorage: sessionStorage.getItem('isAdminSession') === 'true'
    });
  }, [location, persistedParticipantData, forceAdmin]);
  
  // Enhance location state with persisted data if available
  let locationState = getEnhancedLocationState(location.state, persistedParticipantData);
  
  // Determine effective admin status from all sources
  const effectiveAdmin = determineAdminStatus(
    forceAdmin, 
    locationState, 
    persistedParticipantData, 
    location
  );
  
  // Force admin status if detected from any source
  useEffect(() => {
    if (effectiveAdmin) {
      console.log("SessionProviderCore: Enforcing admin status");
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [effectiveAdmin]);
  
  // Load core provider state
  const {
    currentConversationId,
    conversation,
    isLoading,
    refetch,
    showQrCodeView,
    sessionLink,
    isSessionStarted,
    dataError,
    providerError,
    handleError,
    enhancedHandleStartSession,
    isAdmin
  } = useSessionProviderState({ 
    onError, 
    forceAdmin: effectiveAdmin
  });

  // Set up realtime connection
  const connection = useSessionRealtimeConnection({
    conversationId: currentConversationId,
    refetch,
    onError: handleError,
    isAdmin: effectiveAdmin
  });

  // Handle data errors
  useEffect(() => {
    if (dataError) {
      // Skip reporting session full errors for admin users
      const isSessionFullError = dataError.includes("full") || dataError.includes("maximum capacity");
      
      if (isSessionFullError && effectiveAdmin) {
        console.log("🔑 Suppressing session full error for admin in SessionProviderCore");
      } else {
        console.error("Session data error:", dataError);
        handleError(dataError);
      }
    }
  }, [dataError, handleError, effectiveAdmin]);

  // Set up participant management
  const {
    participants,
    currentUserParticipantId,
    currentParticipantCount,
    maxParticipantsForSession,
    isSessionFull,
    forceRefreshParticipants
  } = useSessionParticipantSetup({
    conversationId: currentConversationId,
    conversation,
    locationState,
    refetch,
    onError: handleError,
    onSessionFull: handleSessionFull,
    forceAdmin: effectiveAdmin
  });

  // Check for stuck states and force refresh
  useStuckStateHandler({
    isLoading,
    currentConversationId,
    conversation, 
    refetch,
    forceRefreshParticipants
  });

  // Set up session monitoring
  const {
    isSessionStartedInDB,
    roomState
  } = useSessionMonitoring({
    conversation,
    conversationId: currentConversationId,
    currentUserParticipantId,
    participants,
    onError: handleError,
    forceAdmin: effectiveAdmin
  });

  // Create a safe roomState with defaults to prevent errors
  const safeRoomState = roomState || {
    messages: [],
    inputMessage: "",
    setInputMessage: () => {},
    currentParticipant: 0,
    isRecording: false,
    setIsRecording: () => {},
    handleGenerateReport: async () => Promise.resolve(),
    isGeneratingReport: false,
    setMessages: () => {},
    hasAnswered: false,
    totalResponses: 0,
    viewMode: "participant",
    setViewMode: () => {},
    recordResponse: () => {},
    error: null
  };

  // Get the session context value using our hook
  try {
    const sessionContextValue = useSessionContextValue({
      isLoading,
      conversation,
      currentConversationId,
      refetch,
      showQrCodeView,
      sessionLink,
      isSessionStartedInDB,
      roomState: safeRoomState,
      participants,
      currentUserParticipantId,
      isAdmin,
      providerError,
      connection,
      handleStartSession: enhancedHandleStartSession,
      effectiveAdmin
    });

    // If we have serious errors, return error fallback
    if (providerError && !effectiveAdmin) {
      return (
        <SessionProviderErrorFallback 
          errorMessage={providerError}
          isAdmin={effectiveAdmin}
          onRetry={() => {
            console.log("Retry requested from error fallback");
            refetch();
          }}
        >
          {children}
        </SessionProviderErrorFallback>
      );
    }

    // Return children with context
    return children(sessionContextValue);
  } catch (error) {
    console.error("Fatal error in SessionProviderCore:", error);
    // Create emergency fallback context
    const emergencyContext: SessionContextProps = {
      isLoading: false,
      conversation: null,
      currentConversationId: null,
      sessionState: {
        messages: [],
        inputMessage: "",
        setInputMessage: () => {},
        currentParticipant: 0,
        isRecording: false,
        setIsRecording: () => {},
        hasAnswered: false,
        totalResponses: 0,
        viewMode: "participant",
        setViewMode: () => {},
        handleGenerateReport: async () => { return Promise.resolve(); },
        isGeneratingReport: false,
        setMessages: () => {},
        recordResponse: () => {},
        error: null
      },
      participants: [],
      participantColors,
      isWaitingForResponse: false,
      handleStartSession: () => {},
      handleSendMessage: async () => { return Promise.resolve(); },
      handleLikeMessage: () => {},
      showQrCodeView: false,
      sessionLink: '',
      currentUserParticipantId: null,
      anonymousState: {
        isAnonymous: false,
        toggleAnonymous: () => {}
      },
      isSessionStartedInDB: false,
      error: error instanceof Error ? error.message : "Unknown error in SessionProviderCore",
      isConnected: false,
      connectionAttempts: 0,
      refetch: () => {},
      isAdmin: effectiveAdmin
    };
    
    return children(emergencyContext);
  }
};

// Helper function to enhance location state with persisted data if available
function getEnhancedLocationState(
  originalState: any, 
  persistedParticipantData: any
) {
  let locationState = originalState as { 
    participantId?: number; 
    isGuest?: boolean; 
    participantName?: string;
    showMessaging?: boolean;
    isAdmin?: boolean;
  } | null;
  
  // If we have persisted data but no participant ID in location state, use the persisted data
  if (!locationState?.participantId && persistedParticipantData) {
    locationState = {
      ...locationState,
      participantId: persistedParticipantData.participantId,
      isGuest: true,
      participantName: persistedParticipantData.name,
      isAdmin: persistedParticipantData.isAdmin
    };
    console.log("Enhanced provider location state with persisted data:", locationState);
  }
  
  return locationState;
}

// Helper function to determine admin status from all sources
function determineAdminStatus(
  forceAdmin: boolean | undefined,
  locationState: any,
  persistedParticipantData: any,
  location: any
) {
  return forceAdmin === true || 
         locationState?.isAdmin === true ||
         persistedParticipantData?.isAdmin === true ||
         sessionStorage.getItem('isAdminSession') === 'true' ||
         location.pathname.includes('/admin');
}

// Custom hook to handle stuck states
function useStuckStateHandler({
  isLoading,
  currentConversationId,
  conversation,
  refetch,
  forceRefreshParticipants
}: {
  isLoading: boolean;
  currentConversationId: number | null;
  conversation: any;
  refetch: () => void;
  forceRefreshParticipants?: () => void;
}) {
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading && currentConversationId && !conversation) {
        console.log("Session appears stuck in loading state - forcing data refresh");
        refetch();
        
        // Also refresh participants
        if (forceRefreshParticipants) {
          forceRefreshParticipants();
        }
      }
    }, 5000);
    
    return () => clearTimeout(timeoutId);
  }, [isLoading, currentConversationId, conversation, refetch, forceRefreshParticipants]);
}

// Import participantColors to ensure error fallback has access
import { participantColors } from "@/utils/sessionHelpers";
