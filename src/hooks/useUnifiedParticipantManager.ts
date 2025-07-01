
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { removeChannel } from '@/utils/realtimeHelpers';
import { ParticipantInfo } from '@/types/chat';

interface UseUnifiedParticipantManagerProps {
  conversationId: number | null;
  onParticipantCountChange?: (count: number) => void;
  onMaxParticipantsChange?: (max: number) => void;
  onParticipantsChange?: (participants: ParticipantInfo[]) => void;
  enabled?: boolean;
  isHost?: boolean;
}

// Enhanced global connection registry to prevent conflicts
const connectionRegistry = new Map<string, {
  active: boolean;
  timestamp: number;
  channelRef: any;
}>();

// Clean up stale connections periodically
const STALE_CONNECTION_TIMEOUT = 60000; // 1 minute
setInterval(() => {
  const now = Date.now();
  for (const [key, conn] of connectionRegistry.entries()) {
    if (now - conn.timestamp > STALE_CONNECTION_TIMEOUT) {
      console.log(`🧹 Cleaning up stale connection: ${key}`);
      if (conn.channelRef) {
        try {
          removeChannel(conn.channelRef);
        } catch (e) {
          console.error('Error cleaning up stale channel:', e);
        }
      }
      connectionRegistry.delete(key);
    }
  }
}, STALE_CONNECTION_TIMEOUT);

export function useUnifiedParticipantManager({
  conversationId,
  onParticipantCountChange,
  onMaxParticipantsChange,
  onParticipantsChange,
  enabled = true,
  isHost = false
}: UseUnifiedParticipantManagerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [currentCount, setCurrentCount] = useState(0);
  const [maxCount, setMaxCount] = useState(0);
  
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = isHost ? 1 : 2; // Reduced retries for hosts

  // Create connection key for deduplication
  const connectionKey = `unified-${conversationId}-${isHost ? 'host' : 'participant'}`;

  // Enhanced connection checking
  const canCreateConnection = useCallback(() => {
    if (!conversationId || !enabled) return false;
    
    const existing = connectionRegistry.get(connectionKey);
    if (existing && existing.active) {
      console.log(`🚫 Skipping unified manager - connection already exists for ${connectionKey}`);
      setError('Connection managed by another component');
      return false;
    }
    
    return true;
  }, [conversationId, enabled, connectionKey]);

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
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
    
    // Remove from registry
    const existing = connectionRegistry.get(connectionKey);
    if (existing && existing.channelRef === channelRef.current) {
      connectionRegistry.delete(connectionKey);
      console.log(`🗑️ Removed connection from registry: ${connectionKey}`);
    }
  }, [connectionKey]);

  // Fallback polling for when realtime fails
  const startFallbackPolling = useCallback(async () => {
    if (!conversationId || !mountedRef.current || fallbackIntervalRef.current || !canCreateConnection()) return;

    console.log('🔄 Starting fallback polling for participant data');
    
    fallbackIntervalRef.current = setInterval(async () => {
      if (!mountedRef.current || !conversationId) return;

      try {
        // Fetch conversation data
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('current_participants, participants')
          .eq('id', conversationId)
          .single();

        if (convError) {
          console.error('Fallback polling conversation error:', convError);
          return;
        }

        if (convData) {
          const newCurrentCount = convData.current_participants || 0;
          const newMaxCount = convData.participants || 0;
          
          setCurrentCount(newCurrentCount);
          setMaxCount(newMaxCount);
          
          if (onParticipantCountChange) {
            onParticipantCountChange(newCurrentCount);
          }
          if (onMaxParticipantsChange) {
            onMaxParticipantsChange(newMaxCount);
          }
        }

        // Fetch participants data if host
        if (isHost) {
          const { data: participantsData, error: participantsError } = await supabase
            .from('session_participants')
            .select('*')
            .eq('conversation_id', conversationId);

          if (participantsError) {
            console.error('Fallback polling participants error:', participantsError);
            return;
          }

          if (participantsData) {
            const updatedParticipants: ParticipantInfo[] = participantsData.map(p => ({
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
            if (onParticipantsChange) {
              onParticipantsChange(updatedParticipants);
            }
          }
        }
      } catch (error) {
        console.error('Exception during fallback polling:', error);
      }
    }, 8000); // Increased interval to reduce server load
  }, [conversationId, onParticipantCountChange, onMaxParticipantsChange, onParticipantsChange, isHost, canCreateConnection]);

  // Setup unified realtime subscription
  const setupSubscription = useCallback(() => {
    if (!conversationId || !mountedRef.current || !enabled || !canCreateConnection()) {
      return;
    }

    console.log(`🔗 Setting up unified participant manager for conversation ${conversationId} (${isHost ? 'host' : 'participant'})`);
    
    // Register this connection
    connectionRegistry.set(connectionKey, {
      active: true,
      timestamp: Date.now(),
      channelRef: null // Will be set below
    });
    
    cleanup();
    setError(null);
    
    const channelName = `unified-participant-${conversationId}-${isHost ? 'host' : 'participant'}-${Date.now()}`;
    
    try {
      const channel = supabase
        .channel(channelName)
        // Listen to conversation updates for participant counts
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          if (!mountedRef.current) return;
          
          console.log("🔄 Unified conversation update:", payload);
          
          if (payload.new) {
            const newCurrentCount = payload.new.current_participants || 0;
            const newMaxCount = payload.new.participants || 0;
            
            setCurrentCount(newCurrentCount);
            setMaxCount(newMaxCount);
            
            if (onParticipantCountChange) {
              onParticipantCountChange(newCurrentCount);
            }
            if (onMaxParticipantsChange) {
              onMaxParticipantsChange(newMaxCount);
            }
          }
        });

      // Listen to participant changes if host
      if (isHost) {
        channel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          if (!mountedRef.current) return;
          
          console.log("👥 Unified participant change:", payload);
          
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
      }

      // Subscribe to the channel
      channel.subscribe((status) => {
        if (!mountedRef.current) return;
        
        console.log(`🔗 Unified channel status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
          retryCountRef.current = 0;
          
          // Update registry with channel reference
          const existing = connectionRegistry.get(connectionKey);
          if (existing) {
            existing.channelRef = channel;
          }
          
          // Stop fallback polling if realtime is working
          if (fallbackIntervalRef.current) {
            clearInterval(fallbackIntervalRef.current);
            fallbackIntervalRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('🚨 Unified channel error, starting fallback');
          setIsConnected(false);
          setError('Connection error, using fallback updates');
          
          startFallbackPolling();
          
          // Limited retry for hosts to prevent conflicts
          if (!isHost && retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            const delay = Math.min(2000 * Math.pow(2, retryCountRef.current), 15000);
            
            retryTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                console.log(`🔄 Retrying unified connection (attempt ${retryCountRef.current}/${maxRetries})`);
                setupSubscription();
              }
            }, delay);
          }
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });
        
      channelRef.current = channel;
    } catch (error) {
      console.error("❌ Error creating unified participant channel:", error);
      setError("Failed to establish connection");
      startFallbackPolling();
    }
  }, [conversationId, enabled, onParticipantCountChange, onMaxParticipantsChange, onParticipantsChange, isHost, cleanup, startFallbackPolling, canCreateConnection, connectionKey]);

  // Initial data fetch
  const fetchInitialData = useCallback(async () => {
    if (!conversationId || !enabled || !canCreateConnection()) return;

    try {
      // Fetch conversation data
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('current_participants, participants')
        .eq('id', conversationId)
        .single();

      if (convError) {
        console.error('Error fetching initial conversation data:', convError);
        return;
      }

      if (convData) {
        const initialCurrentCount = convData.current_participants || 0;
        const initialMaxCount = convData.participants || 0;
        
        setCurrentCount(initialCurrentCount);
        setMaxCount(initialMaxCount);
        
        if (onParticipantCountChange) {
          onParticipantCountChange(initialCurrentCount);
        }
        if (onMaxParticipantsChange) {
          onMaxParticipantsChange(initialMaxCount);
        }
      }

      // Fetch participants if host
      if (isHost) {
        const { data: participantsData, error: participantsError } = await supabase
          .from('session_participants')
          .select('*')
          .eq('conversation_id', conversationId);

        if (participantsError) {
          console.error('Error fetching initial participants:', participantsError);
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
      }
    } catch (error) {
      console.error('Exception during initial data fetch:', error);
    }
  }, [conversationId, enabled, isHost, onParticipantCountChange, onMaxParticipantsChange, onParticipantsChange, canCreateConnection]);

  // Setup effect
  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled && conversationId) {
      fetchInitialData();
      setupSubscription();
    }
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [conversationId, enabled, fetchInitialData, setupSubscription, cleanup]);

  // Manual reconnection
  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    setupSubscription();
  }, [setupSubscription]);

  return {
    isConnected,
    error,
    reconnect,
    participants,
    currentCount,
    maxCount
  };
}
