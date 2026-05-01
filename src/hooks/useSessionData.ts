/**
 * use Session Data
 *
 * Hook for the AIfacilitator application.
 */

import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useConversation } from "@/hooks/useConversation";
import { useConversationId, LocationStateType } from "@/hooks/useConversationId";
import { useParticipantTracking } from "@/hooks/useParticipantTracking";
import { useSessionStatus } from "@/hooks/useSessionStatus";
import { useSessionInterface } from "@/hooks/useSessionInterface";
import { useSessionErrorHandling } from "@/hooks/useSessionErrorHandling";
import { ConversationWithSession } from "@/types/database";

export const useSessionData = () => {
  const navigate = useNavigate();

  // Extract conversation ID from URL or state
  const { currentConversationId, locationState } = useConversationId();

  // Fetch conversation data with error handling

  const {
    data: conversation,
    isLoading,
    error,
    refetch
  } = useConversation(currentConversationId);

  // Handle errors from the query
  const errorMessage = error ? error.message : null;

  // Log errors
  useEffect(() => {
    if (error) {
      console.error("Session data error:", error.message);
    }
  }, [error]);

  // Additional validation for conversation data
  useEffect(() => {
    if (conversation?.is_session_ended) {
      // Session has ended - no additional action needed here
    }
  }, [conversation]);

  // Set up session status monitoring
  useSessionStatus(currentConversationId, refetch);

  // Set up participant tracking
  const { participants, setParticipants } = useParticipantTracking(
    locationState,
    conversation as ConversationWithSession,
    currentConversationId
  );

  // Set up session interface (QR code, links, etc.)
  const {
    sessionLink,
    showQrCodeView,
    isSessionStarted,
    handleStartSession
  } = useSessionInterface(currentConversationId, conversation as ConversationWithSession);

  return {
    currentConversationId,
    locationState,
    participants,
    setParticipants,
    sessionLink,
    showQrCodeView,
    conversation,
    isLoading,
    refetch,
    handleStartSession,
    isSessionStarted,
    error: errorMessage
  };
};
