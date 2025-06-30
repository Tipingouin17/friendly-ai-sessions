
import { useState, useEffect, useCallback } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { useSessionParticipantManager } from "@/hooks/useSessionParticipantManager";
import { useOptimizedRealtimeConnection } from "./useOptimizedRealtimeConnection";
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

  // Handle participant changes from realtime
  const handleParticipantChange = useCallback((payload: any) => {
    console.log('👥 [HOST] Real-time participant change:', payload);
    
    if (payload.eventType === 'INSERT' && payload.new) {
      const newParticipant: ParticipantInfo = {
        id: payload.new.participant_id,
        name: payload.new.name,
        avatar: payload.new.avatar_seed 
          ? `/api/avatar?name=${payload.new.avatar_seed}&variant=beam&palette=0` 
          : null,
        isAnonymous: payload.new.is_anonymous || false,
        isHost: payload.new.is_host || false
      };
      
      setParticipants(prev => {
        const exists = prev.some(p => p.id === newParticipant.id);
        if (exists) return prev;
        
        console.log(`👤 [HOST] Adding new participant: ${newParticipant.name} (${newParticipant.id})`);
        return [...prev, newParticipant];
      });
    } else if (payload.eventType === 'DELETE' && payload.old) {
      console.log(`👤 [HOST] Removing participant: ${payload.old.participant_id}`);
      setParticipants(prev => prev.filter(p => p.id !== payload.old.participant_id));
    }
  }, []);

  // Set up optimized realtime connection for participant updates
  useOptimizedRealtimeConnection({
    conversationId: currentConversationId,
    onParticipantChange: handleParticipantChange,
    isHost: true
  });

  // Use session participant manager with enhanced error handling and real refetch
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
    refetch: realRefetch, // Use real refetch instead of mock
    onSessionFull,
    locationState
  });

  // Update local participants state when manager participants change
  useEffect(() => {
    if (managerParticipants && managerParticipants.length > 0) {
      logger.category('admin', `Updating participants from manager: ${managerParticipants.length} participants`);
      setParticipants(managerParticipants);
      // Clear network error if we successfully got participants
      setNetworkError(null);
    }
  }, [managerParticipants, logger]);

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
      currentParticipantCount,
      maxParticipantsForSession,
      isSessionFull,
      isConnected,
      connectionAttempts,
      error: error || null,
      networkError,
      retryCount
    });
  }, [participants.length, currentParticipantCount, maxParticipantsForSession, isSessionFull, isConnected, connectionAttempts, error, logger, networkError, retryCount]);

  return {
    participants,
    setParticipants,
    isLoadingParticipants: !isConnected && connectionAttempts === 0,
    currentParticipantCount,
    maxParticipantsForSession,
    isSessionFull,
    error: networkError || error, // Prioritize network errors for UI handling
    forceRefreshParticipants,
    retryCount
  };
}
