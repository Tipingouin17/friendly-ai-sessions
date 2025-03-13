
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SessionContextProps } from "@/types/session";
import { participantColors } from "@/utils/sessionHelpers";
import { SessionProviderErrorFallback } from "./SessionProviderErrorFallback";
import { useSessionProviderState } from "@/hooks/useSessionProviderState";
import { useSessionParticipantSetup } from "@/hooks/useSessionParticipantSetup";
import { useSessionMonitoring } from "@/hooks/useSessionMonitoring";
import { useToast } from "@/components/ui/use-toast";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";

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
  
  // Enhance location state with persisted data if available
  let locationState = location.state as { 
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
  
  // Determine effective admin status from all sources
  const effectiveAdmin = forceAdmin === true || 
                       locationState?.isAdmin === true ||
                       persistedParticipantData?.isAdmin === true ||
                       sessionStorage.getItem('isAdminSession') === 'true' ||
                       location.pathname.includes('/admin');
  
  // Force admin status if detected from any source
  useEffect(() => {
    if (effectiveAdmin) {
      console.log("SessionProviderCore: Enforcing admin status");
      sessionStorage.setItem('isAdminSession', 'true');
      
      // Show toast for admin users
      toast({
        title: "Admin Mode",
        description: "You have administrator access to this session."
      });
    }
    // No explicit return needed
  }, [effectiveAdmin, toast]);
  
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
    // No explicit return needed
  }, [dataError, handleError, effectiveAdmin]);

  // Set up participant management
  const {
    participants,
    currentUserParticipantId,
    currentParticipantCount,
    maxParticipantsForSession,
    isSessionFull
  } = useSessionParticipantSetup({
    conversationId: currentConversationId,
    conversation,
    locationState,
    refetch,
    onError: handleError,
    onSessionFull: handleSessionFull,
    forceAdmin: effectiveAdmin
  });

  // Log participant information for debugging
  useEffect(() => {
    console.log("SessionProviderCore participant info:", {
      currentConversationId,
      conversationParticipants: conversation?.current_participants,
      hookParticipants: currentParticipantCount,
      participants: participants.length,
      maxParticipants: maxParticipantsForSession,
      isSessionFull,
      forceAdmin,
      locationStateIsAdmin: locationState?.isAdmin,
      effectiveAdmin,
      isAdmin,
      persistedParticipantData
    });
    
    // If we're an admin, we should never see the session full error
    if (isSessionFull && effectiveAdmin) {
      console.error("Admin user incorrectly marked as session full - this should never happen");
    }
    // No explicit return needed
  }, [currentConversationId, conversation, currentParticipantCount, participants.length, 
      maxParticipantsForSession, isSessionFull, forceAdmin, locationState, effectiveAdmin, isAdmin, persistedParticipantData]);

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

  // If we have serious errors, return error fallback
  if (providerError) {
    // Skip showing error fallback for session full errors when admin
    const isSessionFullError = providerError.includes("full") || providerError.includes("maximum capacity");
    
    if (isSessionFullError && effectiveAdmin) {
      console.log("🔑 Admin detected with session full error - bypassing error fallback");
      
      // Build session context with admin override
      const overrideSessionContext: SessionContextProps = {
        ...buildSessionContext(),
        error: null, // Clear error for admin
        isAdmin: true // Force admin status
      };
      
      return children(overrideSessionContext);
    }
    
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

  // Helper function to build session context
  function buildSessionContext(): SessionContextProps {
    return {
      isLoading,
      conversation,
      currentConversationId,
      sessionState: {
        messages: roomState.messages || [], // Ensure messages is an array
        inputMessage: roomState.inputMessage,
        setInputMessage: roomState.setInputMessage,
        currentParticipant: roomState.currentParticipant,
        isRecording: roomState.isRecording,
        setIsRecording: roomState.setIsRecording,
        handleGenerateReport: roomState.handleGenerateReport,
        isGeneratingReport: roomState.isGeneratingReport,
        setMessages: roomState.setMessages,
        hasAnswered: roomState.hasAnswered,
        totalResponses: roomState.totalResponses,
        viewMode: roomState.viewMode,
        setViewMode: roomState.setViewMode,
        recordResponse: roomState.recordResponse,
        error: roomState.error
      },
      participants,
      participantColors,
      isWaitingForResponse: roomState.isWaitingForResponse,
      handleStartSession: enhancedHandleStartSession,
      handleSendMessage: roomState.handleSendMessage,
      handleLikeMessage: roomState.handleLikeMessage,
      showQrCodeView,
      sessionLink,
      currentUserParticipantId,
      anonymousState: roomState.anonymousState,
      isSessionStartedInDB,
      error: providerError,
      
      // Add connection properties
      isConnected: true, // Default to true, will be updated by connection hooks
      connectionAttempts: 0,
      refetch,
      
      // Ensure admin status is properly set
      isAdmin: isAdmin || effectiveAdmin
    };
  }

  // Return children with context
  return children(buildSessionContext());
};
