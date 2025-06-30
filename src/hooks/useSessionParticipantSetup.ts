
import { useState, useEffect, useCallback, useRef } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { LocationStateType } from "@/hooks/useConversationId";
import { getParticipantInfo } from "@/utils/participantUtils";
import { supabase } from "@/integrations/supabase/client";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";
import { useSessionRealtime } from "@/hooks/useSessionRealtime";
import { retryWithBackoff, isNetworkError } from "@/utils/networkUtils";
import { requestDeduplicator } from "@/utils/requestDeduplication";

type UseSessionParticipantSetupProps = {
  conversationId: number | null;
  conversation: ConversationWithSession | null;
  locationState: LocationStateType | null;
  refetch: () => void;
  onError?: (error: string) => void;
  onSessionFull?: () => void;
  forceAdmin?: boolean;
};

export const useSessionParticipantSetup = ({
  conversationId,
  conversation,
  locationState,
  refetch,
  onError,
  onSessionFull,
  forceAdmin
}: UseSessionParticipantSetupProps) => {
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [currentUserParticipantId, setCurrentUserParticipantId] = useState<number | null>(null);
  const [currentParticipantCount, setCurrentParticipantCount] = useState(0);
  const [maxParticipantsForSession, setMaxParticipantsForSession] = useState(0);
  const [isSessionFull, setIsSessionFull] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const { isAdmin, setAdminStatus } = useSessionAdminStatus();
  const adminStatusSetRef = useRef(false);
  const sessionFullCalledRef = useRef(false);
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Enforce admin status if forceAdmin is true
  useEffect(() => {
    if (forceAdmin && !adminStatusSetRef.current) {
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
      adminStatusSetRef.current = true;
    }
  }, [forceAdmin, setAdminStatus]);
  
  // Enhanced participant loading with retry logic
  const loadParticipants = useCallback(async (attempt: number = 1) => {
    if (!conversationId || loadingRef.current) {
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    loadingRef.current = true;
    
    try {
      console.log(`Loading participants for conversation ${conversationId} (attempt ${attempt})`);
      
      const requestKey = `participants-${conversationId}`;
      
      const result = await requestDeduplicator.deduplicate(requestKey, async () => {
        return await retryWithBackoff(async () => {
          const { data, error } = await supabase
            .from('session_participants')
            .select('*')
            .eq('conversation_id', conversationId)
            .abortSignal(abortController.signal);
            
          if (error) {
            console.error("Supabase error loading participants:", error);
            throw error;
          }
          
          return data;
        }, {
          maxAttempts: isNetworkError(loadingError) ? 3 : 1,
          baseDelay: 1000,
          maxDelay: 5000
        });
      });
      
      if (abortController.signal.aborted) {
        return;
      }
      
      if (!result || result.length === 0) {
        console.log("No participants found for conversation:", conversationId);
        setParticipants([]);
        setLoadingError(null);
        setRetryCount(0);
        return;
      }
      
      // Process participants with error handling
      const participantPromises = result.map(async (participant) => {
        try {
          return await getParticipantInfo(participant);
        } catch (err) {
          console.error("Error getting participant info:", err);
          // Return a fallback participant instead of null
          return {
            id: participant.participant_id,
            name: participant.name || `Participant ${participant.participant_id}`,
            avatar: participant.avatar_seed ? `/api/avatar?name=${participant.avatar_seed}&variant=beam&palette=0` : null,
            avatarSeed: participant.avatar_seed || null,
            isAnonymous: participant.is_anonymous || false,
            isHost: participant.is_host || false,
            joinedAt: new Date(participant.created_at),
            lastActive: new Date(participant.created_at),
          };
        }
      });
      
      const participantInfos = (await Promise.all(participantPromises)).filter(Boolean) as ParticipantInfo[];
      console.log("Successfully loaded participants:", participantInfos.length);
      
      setParticipants(participantInfos);
      setLoadingError(null);
      setRetryCount(0);
      
      // Set current participant ID from location state if available
      if (locationState?.participantId) {
        setCurrentUserParticipantId(locationState.participantId);
      }
      
    } catch (err: any) {
      if (abortController.signal.aborted) {
        return;
      }
      
      console.error("Error loading participants:", err);
      setLoadingError(err.message || "Failed to load participants");
      setRetryCount(prev => prev + 1);
      
      // Only call onError for non-network errors or after multiple failed attempts
      if (!isNetworkError(err) || attempt >= 3) {
        if (onError) {
          onError(`Failed to load session participants: ${err.message}`);
        }
      }
    } finally {
      loadingRef.current = false;
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [conversationId, locationState, onError, loadingError]);
  
  // Load participants when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadParticipants();
    }
    
    // Cleanup on unmount or conversation change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      loadingRef.current = false;
    };
  }, [conversationId, loadParticipants]);
  
  // Update participant counts when conversation or participants change
  useEffect(() => {
    if (conversation) {
      const maxParticipants = conversation.participants || 0;
      const currentCount = conversation.current_participants || 0;
      
      setMaxParticipantsForSession(maxParticipants);
      setCurrentParticipantCount(currentCount);
      
      // Check if session is full
      const isFull = maxParticipants > 0 && currentCount >= maxParticipants;
      setIsSessionFull(isFull);
      
      // Call onSessionFull if session is full and not already called
      if (isFull && onSessionFull && !sessionFullCalledRef.current && !forceAdmin) {
        sessionFullCalledRef.current = true;
        onSessionFull();
      }
    }
  }, [conversation, participants, onSessionFull, forceAdmin]);
  
  // Set up realtime updates for participants
  const { error: realtimeError } = useSessionRealtime({
    currentConversationId: conversationId,
    participants,
    setParticipants,
    conversation,
    refetch,
    handleSessionFull: onSessionFull,
    onSessionStarted: () => {}
  });
  
  // Handle realtime errors
  useEffect(() => {
    if (realtimeError && onError && !isNetworkError({ message: realtimeError })) {
      onError(realtimeError);
    }
  }, [realtimeError, onError]);
  
  // Force refresh participants function with retry logic
  const forceRefreshParticipants = useCallback(async () => {
    if (!conversationId) return;
    
    console.log("Forcing refresh of participants");
    requestDeduplicator.clear(`participants-${conversationId}`);
    await loadParticipants(retryCount + 1);
  }, [conversationId, loadParticipants, retryCount]);
  
  return {
    participants,
    currentUserParticipantId,
    currentParticipantCount,
    maxParticipantsForSession,
    isSessionFull,
    forceRefreshParticipants,
    loadingError,
    retryCount
  };
};
