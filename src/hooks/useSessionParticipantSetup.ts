
import { useState, useEffect, useCallback, useRef } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { LocationStateType } from "@/hooks/useConversationId";
import { getParticipantInfo } from "@/utils/participantUtils";
import { supabase } from "@/integrations/supabase/client";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";
import { useSessionRealtime } from "@/hooks/useSessionRealtime";
import { retryWithBackoff, isNetworkError, isAbortError } from "@/utils/networkUtils";
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
  const currentConversationIdRef = useRef<number | null>(null);
  
  // Enforce admin status if forceAdmin is true
  useEffect(() => {
    if (forceAdmin && !adminStatusSetRef.current) {
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
      adminStatusSetRef.current = true;
    }
  }, [forceAdmin, setAdminStatus]);
  
  // Enhanced participant loading with better abort handling
  const loadParticipants = useCallback(async () => {
    if (!conversationId || loadingRef.current) {
      return;
    }

    // Only abort if we're switching to a different conversation
    if (abortControllerRef.current && currentConversationIdRef.current !== conversationId) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Update the current conversation ID reference
    currentConversationIdRef.current = conversationId;

    // Create new abort controller only if we don't have one for this conversation
    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController();
    }

    const abortController = abortControllerRef.current;
    loadingRef.current = true;
    
    try {
      
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
          maxAttempts: 2, // Reduce attempts to prevent loops
          baseDelay: 1000,
          maxDelay: 3000
        });
      }, abortController.signal);
      
      if (abortController.signal.aborted) {
        return;
      }
      
      if (!result || result.length === 0) {
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
      
      setParticipants(participantInfos);
      setLoadingError(null);
      setRetryCount(0);
      
      // Enhanced participant ID detection from multiple sources
      let participantId = null;
      
      // Priority 1: URL location state
      if (locationState?.participantId) {
        participantId = locationState.participantId;
      }

      // Priority 1.5: Direct URL params (for direct navigation without React Router state)
      if (!participantId) {
        const urlParams = new URLSearchParams(window.location.search);
        const urlParticipantId = urlParams.get('participantId');
        const urlName = urlParams.get('name');
        if (urlParticipantId) {
          const parsedId = parseInt(urlParticipantId, 10);
          // Check if this participant already exists in the list
          const existingParticipant = participantInfos.find(p => p.id === parsedId);
          if (existingParticipant) {
            participantId = parsedId;
          } else if (urlName && conversationId) {
            // Auto-register participant if they have a name but aren't registered yet
            try {
              const avatarSeed = `${urlName}-${Date.now()}`;
              const { error: regError } = await supabase
                .from('session_participants')
                .insert({
                  conversation_id: conversationId,
                  participant_id: parsedId,
                  name: urlName,
                  avatar_seed: avatarSeed,
                  is_anonymous: false,
                  is_host: false
                });
              if (!regError) {
                participantId = parsedId;
                // Reload participants after registration
                requestDeduplicator.clear(`participants-${conversationId}`);
              } else {
                // If insert fails (e.g. duplicate), still use the ID
                participantId = parsedId;
              }
            } catch (regErr) {
              // If registration fails, still use the URL participant ID
              participantId = parsedId;
            }
          } else {
            participantId = parsedId;
          }
        }
      }
      
      // Priority 2: Find participant by checking if current user is in the participant list
      if (!participantId && participantInfos.length > 0) {
        // For participants accessing via direct URL, try to find their ID
        const urlParams = new URLSearchParams(window.location.search);
        const participantName = urlParams.get('name');
        
        if (participantName) {
          const matchingParticipant = participantInfos.find(p => 
            p.name.toLowerCase() === participantName.toLowerCase()
          );
          if (matchingParticipant) {
            participantId = matchingParticipant.id;
          }
        }
      }
      
      // Priority 3: If still no ID and only one participant, assume it's them
      if (!participantId && participantInfos.length === 1 && !window.location.pathname.includes('/admin') && !window.location.pathname.includes('/host')) {
        participantId = participantInfos[0].id;
      }
      
      if (participantId) {
        setCurrentUserParticipantId(participantId);
      } else { /* no-op */ }
      
    } catch (err: any) {
      if (isAbortError(err)) {
        return;
      }
      
      console.error("Error loading participants:", err);
      setRetryCount(prev => prev + 1);
      
      // Only set error for non-network errors and non-abort errors
      if (!isNetworkError(err)) {
        setLoadingError(err.message || "Failed to load participants");
        if (onError) {
          onError(`Failed to load session participants: ${err.message}`);
        }
      }
    } finally {
      loadingRef.current = false;
    }
  }, [conversationId, locationState, onError]);
  
  // Load participants when conversation changes (not on every render)
  useEffect(() => {
    if (conversationId && conversationId !== currentConversationIdRef.current) {
      loadParticipants();
    }
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      loadingRef.current = false;
      currentConversationIdRef.current = null;
    };
  }, [conversationId]); // Only depend on conversationId
  
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
    onSessionStarted: () => { /* no-op */ }
  });
  
  // Handle realtime errors (exclude abort errors)
  useEffect(() => {
    if (realtimeError && onError && !isNetworkError({ message: realtimeError }) && !isAbortError({ message: realtimeError })) {
      onError(realtimeError);
    }
  }, [realtimeError, onError]);
  
  // Force refresh participants function
  const forceRefreshParticipants = useCallback(async () => {
    if (!conversationId) return;
    
    requestDeduplicator.clear(`participants-${conversationId}`);
    
    // Reset the conversation ID ref to force a reload
    currentConversationIdRef.current = null;
    await loadParticipants();
  }, [conversationId, loadParticipants]);
  
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
