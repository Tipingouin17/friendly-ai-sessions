
import { useState, useEffect, useCallback } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { useParticipantCounts } from "@/hooks/useParticipantCounts";
import { useRealtimeConnectionHandler } from "@/hooks/useRealtimeConnectionHandler";
import { useUnifiedParticipantManager } from "@/hooks/useUnifiedParticipantManager";
import { supabase } from "@/integrations/supabase/client";
import { retryWithBackoff, isNetworkError } from "@/utils/networkUtils";
import { requestDeduplicator } from "@/utils/requestDeduplication";

interface UseSessionParticipantManagerProps {
  conversationId: number | null;
  conversation: ConversationWithSession | null;
  refetch: () => Promise<any>;
  onSessionFull?: () => void;
  locationState?: { 
    participantId?: number; 
    isGuest?: boolean; 
    participantName?: string;
  } | null;
}

export function useSessionParticipantManager({
  conversationId,
  conversation,
  refetch,
  onSessionFull,
  locationState
}: UseSessionParticipantManagerProps) {
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const currentUserParticipantId = locationState?.participantId || null;
  
  // Use unified participant manager instead of multiple hooks
  const {
    isConnected,
    error: unifiedError,
    participants: unifiedParticipants,
    currentCount,
    maxCount,
    reconnect
  } = useUnifiedParticipantManager({
    conversationId,
    onParticipantsChange: (newParticipants) => {
      console.log("Session participant manager received participants update:", newParticipants.length);
      setParticipants(newParticipants);
    },
    enabled: !!conversationId,
    isHost: true // Enable participant tracking
  });

  // Realtime connection management with enhanced error handling
  const {
    connectionAttempts,
    attemptReconnection,
    connectionError
  } = useRealtimeConnectionHandler({
    conversationId,
    refetch,
    onConnectionError: (err) => {
      if (!isNetworkError({ message: err })) {
        setError(err);
      }
    }
  });

  // Participant counts management - use unified values when available
  const {
    currentParticipantCount: fallbackCurrentCount,
    setCurrentParticipantCount,
    maxParticipantsForSession: fallbackMaxCount,
    setMaxParticipantsForSession
  } = useParticipantCounts(conversation);

  // Use unified counts when available, fall back to existing logic
  const currentParticipantCount = currentCount > 0 ? currentCount : fallbackCurrentCount;
  const maxParticipantsForSession = maxCount > 0 ? maxCount : fallbackMaxCount;

  // Function to force refresh participant data with retry logic
  const forceRefreshParticipants = useCallback(async (): Promise<void> => {
    if (!conversationId) {
      return Promise.resolve();
    }
    
    try {
      console.log("Forcibly refreshing participant data for conversation:", conversationId);
      
      const requestKey = `refresh-participants-${conversationId}`;
      
      const data = await requestDeduplicator.deduplicate(requestKey, async () => {
        return await retryWithBackoff(async () => {
          const { data, error } = await supabase
            .from('session_participants')
            .select('*')
            .eq('conversation_id', conversationId);
            
          if (error) {
            console.error("Error fetching participant data:", error);
            throw error;
          }
          
          return data;
        }, {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 5000
        });
      });
      
      if (data && data.length > 0) {
        console.log("Retrieved updated participant data:", data.length, "participants");
        
        const updatedParticipants: ParticipantInfo[] = data.map(p => ({
          id: p.participant_id,
          name: p.name || `Participant ${p.participant_id}`,
          avatar: p.avatar_seed ? `/api/avatar?name=${p.avatar_seed}&variant=beam&palette=0` : null,
          avatarSeed: p.avatar_seed || null,
          isAnonymous: p.is_anonymous || false,
          isHost: p.is_host || false,
          joinedAt: new Date(p.created_at),
          lastActive: new Date(p.created_at),
        }));
        
        setParticipants(updatedParticipants);
        setError(null);
        setRetryCount(0);
      } else if (conversation?.current_participants) {
        const count = conversation.current_participants;
        console.log("No participant data found, creating placeholders for", count, "participants");
        
        const placeholders: ParticipantInfo[] = Array.from({ length: count }, (_, i) => ({
          id: i + 1,
          name: `Participant ${i + 1}`,
          avatar: null,
          avatarSeed: null,
          isAnonymous: false,
          isHost: false,
          joinedAt: new Date(),
          lastActive: new Date(),
        }));
        
        setParticipants(placeholders);
      }
      
      return Promise.resolve();
    } catch (err: any) {
      console.error("Error in forceRefreshParticipants:", err);
      setRetryCount(prev => prev + 1);
      
      // Only set error for non-network errors
      if (!isNetworkError(err)) {
        setError(`Failed to refresh participants: ${err.message}`);
      }
      
      return Promise.resolve();
    }
  }, [conversationId, conversation?.current_participants]);

  // Update participants from unified manager
  useEffect(() => {
    if (unifiedParticipants && unifiedParticipants.length > 0) {
      console.log("Using unified participants:", unifiedParticipants.length);
      setParticipants(unifiedParticipants);
      setError(null);
    }
  }, [unifiedParticipants]);

  // Handle unified manager errors (only non-network errors)
  useEffect(() => {
    if (unifiedError && !isNetworkError({ message: unifiedError })) {
      console.error("Unified participant manager error:", unifiedError);
      setError(unifiedError);
    }
  }, [unifiedError]);

  // Check if session is full
  const isSessionFull = useCallback(() => {
    const isFull = maxParticipantsForSession > 0 && 
           currentParticipantCount >= maxParticipantsForSession;
           
    if (isFull && onSessionFull) {
      console.log("Session is full, triggering onSessionFull callback");
      onSessionFull();
    }
    
    return isFull;
  }, [currentParticipantCount, maxParticipantsForSession, onSessionFull]);

  // Update parent components when session becomes full
  useEffect(() => {
    isSessionFull();
  }, [isSessionFull]);

  // Update participants based on conversation data (fallback)
  useEffect(() => {
    if (conversation && conversation.current_participants > 0) {
      if (conversation.current_participants > participants.length && participants.length === 0) {
        console.log("Updating participants based on conversation count:", 
                    conversation.current_participants, "current:", participants.length);
        
        forceRefreshParticipants();
      }
    }
  }, [conversation, participants.length, forceRefreshParticipants]);

  return {
    participants,
    setParticipants,
    isConnected,
    connectionAttempts,
    currentParticipantCount,
    maxParticipantsForSession,
    currentUserParticipantId,
    isSessionFull: isSessionFull(),
    error: connectionError || error,
    forceRefreshParticipants,
    retryCount,
    reconnect: reconnect || attemptReconnection
  };
}
