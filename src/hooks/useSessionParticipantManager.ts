/**
 * use Session Participant Manager
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import api from "@/lib/api";
import { removeChannel } from '@/utils/realtimeHelpers';
import { ParticipantInfo } from '@/types/chat';
import { ConversationWithSession } from '@/types/database';
import { createLogger } from '@/utils/debugLogger';
import { isNetworkError } from '@/utils/networkUtils';
import { getScheduledStartIso } from '@/services/facilitatorService';
import { LocationStateType } from '@/hooks/useConversationId';

interface UseSessionParticipantManagerProps {
  conversationId: number | null;
  conversation: ConversationWithSession | null;
  refetch?: () => Promise<unknown> | void;
  onSessionFull?: () => void;
  locationState?: LocationStateType | null;
}

export function useSessionParticipantManager({
  conversationId,
  conversation,
  refetch,
  onSessionFull,
  locationState
}: UseSessionParticipantManagerProps) {
  const logger = createLogger('SessionParticipantManager', 'participants');
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const channelRef = useRef<ReturnType<typeof api.channel> | null>(null);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 3;

  // Memoized values
  const currentParticipantCount = useMemo(() => participants.length, [participants.length]);
  const maxParticipantsForSession = useMemo(() => conversation?.participants || 0, [conversation?.participants]);
  // Fall back to the URL search param when location.state is absent (page refresh,
  // direct navigation, or mobile deep-link — React Router drops state in those cases).
  const currentUserParticipantId = useMemo(() => {
    if (locationState?.participantId) return locationState.participantId as number;
    try {
      const p = new URLSearchParams(window.location.search).get('participantId');
      return p ? parseInt(p, 10) : null;
    } catch { return null; }
  }, [locationState?.participantId]);
  const isSessionFull = useMemo(() => 
    currentParticipantCount >= maxParticipantsForSession && maxParticipantsForSession > 0,
    [currentParticipantCount, maxParticipantsForSession]
  );
  const isScheduledWaitingRoom = useMemo(() =>
    Boolean(getScheduledStartIso(conversation?.flow_config)) && !conversation?.session_started,
    [conversation?.flow_config, conversation?.session_started]
  );

  // Cleanup function
  const cleanup = useCallback(() => {
    if (channelRef.current) {
      removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Setup realtime subscription for participants
  const setupParticipantSubscription = useCallback(() => {
    if (!conversationId || !mountedRef.current) return;

    logger.category('participants', `Setting up participant subscription for conversation ${conversationId}`);
    
    cleanup();
    setError(null);
    setConnectionAttempts(prev => prev + 1);
    
    const channelName = `participant-manager-${conversationId}`;
    
    try {
      const channel = api
        .channel(channelName)
        // Listen to conversation updates for participant counts
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          if (!mountedRef.current) return;
          
          logger.category('participants', 'Conversation update:', payload);
          
          if (payload.new && refetch) {
            refetch().catch((err) => {
              logger.category('participants', 'Refetch error:', err);
            });
          }
        })
        // Listen to participant changes
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          if (!mountedRef.current) return;
          
          logger.category('participants', 'Participant change:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            const newParticipant: ParticipantInfo = {
              id: payload.new.participant_id,
              name: payload.new.name,
              avatar: payload.new.avatar_seed 
                ? `/api/avatar?name=${payload.new.avatar_seed}&variant=beam&palette=0` 
                : null,
              avatarSeed: payload.new.avatar_seed,
              isAnonymous: payload.new.is_anonymous || false,
              isHost: payload.new.is_host || false,
              joinedAt: new Date(payload.new.created_at),
              lastActive: new Date(payload.new.created_at),
            };
            
            setParticipants(prev => {
              const exists = prev.some(p => p.id === newParticipant.id);
              if (exists) return prev;
              return [...prev, newParticipant];
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setParticipants(prev => prev.filter(p => p.id !== payload.old.participant_id));
          }
        });

      // Subscribe to the channel
      channel.subscribe((status) => {
        if (!mountedRef.current) return;
        
        logger.category('participants', `Channel status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
          setRetryCount(0);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.category('participants', 'Channel error, will retry');
          setIsConnected(false);
          
          const errorMessage = 'Connection issue - retrying...';
          setError(errorMessage);
          
          if (retryCount < maxRetries) {
            setRetryCount(prev => prev + 1);
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
            
            retryTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                setupParticipantSubscription();
              }
            }, delay);
          } else {
            setError('Connection failed after multiple attempts');
          }
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });
        
      channelRef.current = channel;
    } catch (error) {
      logger.category('participants', 'Error creating participant channel:', error);
      const errorMessage = "Failed to establish connection";
      setError(errorMessage);
    }
  }, [conversationId, refetch, retryCount, cleanup, logger]);

  // Initial data fetch
  const fetchInitialParticipants = useCallback(async () => {
    if (!conversationId) return;

    try {
      const { data: participantsData, error: participantsError } = await api
        .from('session_participants')
        .select('*')
        .eq('conversation_id', conversationId);

      if (participantsError) {
        logger.category('participants', 'Error fetching initial participants:', participantsError);
        return;
      }

      if (participantsData) {
        const initialParticipants: ParticipantInfo[] = participantsData.map(p => ({
          id: p.participant_id,
          name: p.name || `Participant ${p.participant_id}`,
          avatar: p.avatar_seed ? `/api/avatar?name=${p.avatar_seed}&variant=beam&palette=0` : null,
          avatarSeed: p.avatar_seed || null,
          isAnonymous: p.is_anonymous || false,
          isHost: p.is_host || false,
          joinedAt: new Date(p.created_at),
          lastActive: new Date(p.created_at),
        }));
        
        setParticipants(initialParticipants);
        logger.category('participants', `Loaded ${initialParticipants.length} initial participants`);
      }
    } catch (error) {
      logger.category('participants', 'Exception during initial data fetch:', error);
    }
  }, [conversationId, logger]);

  // Setup effect
  useEffect(() => {
    mountedRef.current = true;
    
    if (conversationId) {
      fetchInitialParticipants();
      setupParticipantSubscription();
    }
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [conversationId, fetchInitialParticipants, setupParticipantSubscription, cleanup]);

  // Session full detection
  useEffect(() => {
    if (isSessionFull && onSessionFull && !isScheduledWaitingRoom) {
      logger.category('participants', `Session full detected: ${currentParticipantCount}/${maxParticipantsForSession}`);
      onSessionFull();
    }
  }, [isSessionFull, onSessionFull, isScheduledWaitingRoom, currentParticipantCount, maxParticipantsForSession, logger]);

  // Force refresh function
  const forceRefreshParticipants = useCallback(() => {
    logger.category('participants', 'Force refreshing participants');
    fetchInitialParticipants();
    setupParticipantSubscription();
  }, [fetchInitialParticipants, setupParticipantSubscription, logger]);

  return {
    participants,
    isConnected,
    connectionAttempts,
    currentParticipantCount,
    maxParticipantsForSession,
    currentUserParticipantId,
    isSessionFull,
    error,
    forceRefreshParticipants,
    retryCount
  };
}
