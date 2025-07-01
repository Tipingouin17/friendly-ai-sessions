
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { removeChannel } from '@/utils/realtimeHelpers';
import { ParticipantInfo } from '@/types/chat';
import { createLogger } from '@/utils/debugLogger';

interface UseHostParticipantManagerProps {
  conversationId: number | null;
  onParticipantCountChange?: (count: number) => void;
  onParticipantsChange?: (participants: ParticipantInfo[]) => void;
  enabled?: boolean;
}

export function useHostParticipantManager({
  conversationId,
  onParticipantCountChange,
  onParticipantsChange,
  enabled = true
}: UseHostParticipantManagerProps) {
  const logger = createLogger('HostParticipantManager', 'admin');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [currentCount, setCurrentCount] = useState(0);
  
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 2; // Reduced retries for host to avoid conflicts

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

  // Setup host-specific realtime subscription
  const setupHostSubscription = useCallback(() => {
    if (!conversationId || !mountedRef.current || !enabled) return;

    logger.category('admin', `Setting up host participant manager for conversation ${conversationId}`);
    
    cleanup();
    setError(null);
    
    const channelName = `host-participants-${conversationId}-${Date.now()}`;
    
    try {
      const channel = supabase
        .channel(channelName)
        // Listen to conversation updates
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          if (!mountedRef.current) return;
          
          logger.category('admin', 'Host conversation update:', payload);
          
          if (payload.new) {
            const newCurrentCount = payload.new.current_participants || 0;
            setCurrentCount(newCurrentCount);
            
            if (onParticipantCountChange) {
              onParticipantCountChange(newCurrentCount);
            }
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
          
          logger.category('admin', 'Host participant change:', payload);
          
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
              const updated = [...prev, newParticipant];
              if (onParticipantsChange) {
                onParticipantsChange(updated);
              }
              return updated;
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setParticipants(prev => {
              const updated = prev.filter(p => p.id !== payload.old.participant_id);
              if (onParticipantsChange) {
                onParticipantsChange(updated);
              }
              return updated;
            });
          }
        });

      // Subscribe to the channel
      channel.subscribe((status) => {
        if (!mountedRef.current) return;
        
        logger.category('admin', `Host channel status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.category('admin', 'Host channel error, will retry');
          setIsConnected(false);
          setError('Connection issue - retrying...');
          
          // Limited retry for host to avoid conflicts
          retryTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setupHostSubscription();
            }
          }, 3000);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });
        
      channelRef.current = channel;
    } catch (error) {
      logger.category('admin', 'Error creating host participant channel:', error);
      setError("Host connection failed");
    }
  }, [conversationId, enabled, onParticipantCountChange, onParticipantsChange, cleanup, logger]);

  // Initial data fetch
  const fetchInitialData = useCallback(async () => {
    if (!conversationId || !enabled) return;

    try {
      // Fetch conversation data
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('current_participants')
        .eq('id', conversationId)
        .single();

      if (convError) {
        logger.category('admin', 'Error fetching host conversation data:', convError);
        return;
      }

      if (convData) {
        const initialCurrentCount = convData.current_participants || 0;
        setCurrentCount(initialCurrentCount);
        
        if (onParticipantCountChange) {
          onParticipantCountChange(initialCurrentCount);
        }
      }

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('session_participants')
        .select('*')
        .eq('conversation_id', conversationId);

      if (participantsError) {
        logger.category('admin', 'Error fetching host participants:', participantsError);
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
        if (onParticipantsChange) {
          onParticipantsChange(initialParticipants);
        }
      }
    } catch (error) {
      logger.category('admin', 'Exception during host initial data fetch:', error);
    }
  }, [conversationId, enabled, onParticipantCountChange, onParticipantsChange, logger]);

  // Setup effect
  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled && conversationId) {
      fetchInitialData();
      setupHostSubscription();
    }
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [conversationId, enabled, fetchInitialData, setupHostSubscription, cleanup]);

  return {
    isConnected,
    error,
    participants,
    currentCount
  };
}
