
import { useState, useEffect, useCallback } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { useSessionParticipantManager } from "@/hooks/useSessionParticipantManager";
import { useHostParticipantManager } from "@/hooks/useHostParticipantManager";
import { createLogger } from "@/utils/debugLogger";
import { isNetworkError } from "@/utils/networkUtils";
import { supabase } from "@/integrations/supabase/client";

interface UseHostParticipantStateProps {
  locationState?: any;
  conversationData: ConversationWithSession | null;
  currentConversationId: number | null;
  onSessionFull?: () => void;
}

export function useHostParticipantState({
  locationState,
  conversationData,
  currentConversationId,
  onSessionFull
}: UseHostParticipantStateProps) {
  const logger = createLogger('HostParticipantState', 'admin');
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Real refetch function that fetches conversation data
  const realRefetch = useCallback(async () => {
    if (!currentConversationId) {
      logger.category('admin', 'No conversation ID for refetch');
      return Promise.resolve();
    }

    try {
      logger.category('admin', `Refetching conversation data for ${currentConversationId}`);
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          current_participants,
          participants,
          session_started,
          participant_description,
          language,
          sessions_id
        `)
        .eq('id', currentConversationId)
        .single();

      if (error) {
        logger.category('admin', 'Refetch error:', error);
        throw error;
      }

      logger.category('admin', 'Refetch successful:', {
        currentParticipants: data?.current_participants,
        maxParticipants: data?.participants
      });

      return data;
    } catch (error) {
      logger.category('admin', 'Exception during refetch:', error);
      throw error;
    }
  }, [currentConversationId, logger]);

  // Enhanced error handler that filters network errors
  const handleError = useCallback((error: string) => {
    if (isNetworkError({ message: error })) {
      setNetworkError(error);
      logger.category('admin', 'Network error detected:', error);
    } else {
      logger.category('admin', 'Non-network error:', error);
    }
  }, [logger]);

  // Use dedicated host participant manager
  const { 
    isConnected: hostConnected, 
    error: hostError, 
    participants: hostParticipants,
    currentCount: hostCurrentCount
  } = useHostParticipantManager({
    conversationId: currentConversationId,
    onParticipantsChange: (newParticipants) => {
      logger.category('admin', `Host manager: Updating participants to ${newParticipants.length}`);
      setParticipants(newParticipants);
      setNetworkError(null); // Clear network error on successful update
    },
    enabled: !!currentConversationId
  });

  // Use session participant manager as fallback with real refetch
  const {
    participants: managerParticipants,
    isConnected,
    connectionAttempts,
    currentParticipantCount,
    maxParticipantsForSession,
    currentUserParticipantId,
    isSessionFull,
    error,
    forceRefreshParticipants,
    retryCount
  } = useSessionParticipantManager({
    conversationId: currentConversationId,
    conversation: conversationData,
    refetch: realRefetch,
    onSessionFull,
    locationState
  });

  // Use host participants when available, fall back to manager participants
  useEffect(() => {
    if (hostParticipants && hostParticipants.length > 0) {
      logger.category('admin', `Using host participants: ${hostParticipants.length} participants`);
      setParticipants(hostParticipants);
      setNetworkError(null);
    } else if (managerParticipants && managerParticipants.length > 0) {
      logger.category('admin', `Falling back to manager participants: ${managerParticipants.length} participants`);
      setParticipants(managerParticipants);
      setNetworkError(null);
    }
  }, [hostParticipants, managerParticipants, logger]);

  // Check for session full condition
  useEffect(() => {
    const currentCount = participants.length;
    const maxCount = conversationData?.participants || 0;
    
    if (currentCount >= maxCount && maxCount > 0 && onSessionFull) {
      console.log(`🎯 [HOST] Session full detected: ${currentCount}/${maxCount} participants`);
      onSessionFull();
    }
  }, [participants.length, conversationData?.participants, onSessionFull]);

  // Log state changes
  useEffect(() => {
    logger.category('admin', 'Host participant state updated:', {
      participantCount: participants.length,
      currentParticipantCount: hostCurrentCount || currentParticipantCount,
      maxParticipantsForSession,
      isSessionFull,
      hostConnected,
      isConnected,
      connectionAttempts,
      error: error || hostError || null,
      networkError,
      retryCount
    });
  }, [participants.length, hostCurrentCount, currentParticipantCount, maxParticipantsForSession, isSessionFull, hostConnected, isConnected, connectionAttempts, error, hostError, logger, networkError, retryCount]);

  return {
    participants,
    setParticipants,
    isLoadingParticipants: !hostConnected && !isConnected && connectionAttempts === 0,
    currentParticipantCount: hostCurrentCount || currentParticipantCount,
    maxParticipantsForSession,
    isSessionFull,
    error: networkError || hostError || error, // Prioritize network errors for UI handling
    forceRefreshParticipants,
    retryCount
  };
}
