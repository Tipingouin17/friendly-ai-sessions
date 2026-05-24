/**
 * use Session Participant Setup
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { LocationStateType } from "@/hooks/useConversationId";
import { getParticipantInfo } from "@/utils/participantUtils";
import api from "@/lib/api";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";
import { useSessionRealtime } from "@/hooks/useSessionRealtime";
import { retryWithBackoff, isNetworkError, isAbortError } from "@/utils/networkUtils";
import { requestDeduplicator } from "@/utils/requestDeduplication";
import { getOrCreateDeviceId } from "@/hooks/useDeviceId";
import { readParticipantDataByDevice } from "@/hooks/useParticipantPersistence";

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
      
      // NOTE: We do NOT pass the abortController.signal to requestDeduplicator.
      // Passing it caused a loop: the deduplicator's internal abort would fire
      // whenever the signal was aborted (e.g. on unmount), which deleted the
      // pending request entry and allowed a new request to start immediately,
      // which was then aborted again — producing the "The operation was aborted."
      // loop visible in the console.  The abortController is still used on the
      // Supabase query itself so that in-flight network requests are cancelled
      // on unmount, but the deduplicator no longer listens to it.
      const result = await requestDeduplicator.deduplicate(requestKey, async () => {
        return await retryWithBackoff(async () => {
          // Check abort before each attempt
          if (abortController.signal.aborted) throw new DOMException('Aborted', 'AbortError');

          const { data, error } = await api
            .from('session_participants')
            .select('*')
            .eq('conversation_id', conversationId)
            .abortSignal(abortController.signal);
            
          if (error) {
            // Only log non-abort errors — AbortError is a normal cancellation
            // (component unmount or conversation change) and must not appear
            // in the console as a "Supabase error".
            if (!isAbortError(error)) {
              console.error("Error loading participants:", error);
            }
            throw error;
          }
          
          return data;
        }, {
          maxAttempts: 2, // Reduce attempts to prevent loops
          baseDelay: 1000,
          maxDelay: 3000
        });
      });
      
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
      
      // ── Participant ID resolution ──────────────────────────────────────────
      // We use a strict priority chain that relies on the deviceId as the
      // authoritative identity signal.  The old heuristics (match-by-name,
      // single-participant assumption) are removed because they caused
      // BUG-A: a new participant who happened to get the same slot number
      // (participant_id) as a previously removed participant would load the
      // wrong conversation.
      let participantId: number | null = null;

      const deviceId = getOrCreateDeviceId();

      // Priority 1: React Router location state (set by useJoinSessionNavigation
      //   right after a successful join — most reliable source).
      if (locationState?.participantId) {
        participantId = locationState.participantId;
      }

      // Priority 2: localStorage scoped by (conversationId + deviceId).
      //   This covers the case where the participant refreshes the page or
      //   navigates back after a successful join in the same browser.
      if (!participantId && conversationId) {
        const stored = readParticipantDataByDevice(conversationId, deviceId);
        if (stored) {
          // Verify the stored participantId still exists in the current
          // participant list (it may have been removed by the host).
          const stillPresent = participantInfos.find(p => p.id === stored.participantId);
          if (stillPresent) {
            participantId = stored.participantId;
          }
          // If the slot was removed, participantId stays null → the join
          // form will be shown so the participant can re-enter.
        }
      }

      // Priority 3: URL param — only trusted when the participant was
      //   just redirected here by useJoinSessionNavigation (i.e. the
      //   localStorage entry hasn't been written yet because this effect
      //   ran before persistParticipantData completed).  We still verify
      //   the slot exists in the DB list to avoid accepting stale URLs.
      if (!participantId) {
        const urlParams = new URLSearchParams(window.location.search);
        const urlParticipantId = urlParams.get('participantId');
        if (urlParticipantId) {
          const parsedId = parseInt(urlParticipantId, 10);
          const existingParticipant = participantInfos.find(p => p.id === parsedId);
          if (existingParticipant) {
            participantId = parsedId;
          }
          // If the slot doesn't exist in the DB list we intentionally do NOT
          // fall back to it — this is the exact scenario that caused BUG-A.
        }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
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
