import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { removeChannel } from '@/utils/realtimeHelpers';
import { ParticipantInfo } from '@/types/chat';
import { createLogger } from '@/utils/debugLogger';
import { startTiming, endTiming, markMilestone } from '@/utils/performanceMonitor';

interface UseEnhancedHostParticipantManagerProps {
  conversationId: number | null;
  onParticipantCountChange?: (count: number) => void;
  onMaxParticipantsChange?: (max: number) => void;
  onParticipantsChange?: (participants: ParticipantInfo[]) => void;
  onSessionStarted?: () => void;
  onSessionFull?: () => void;
  enabled?: boolean;
}

// Global connection registry to prevent duplicate subscriptions
const hostConnectionRegistry = new Map<number, {
  active: boolean;
  timestamp: number;
  channelRef: any;
}>();

export function useEnhancedHostParticipantManager({
  conversationId,
  onParticipantCountChange,
  onMaxParticipantsChange,
  onParticipantsChange,
  onSessionStarted,
  onSessionFull,
  enabled = true
}: UseEnhancedHostParticipantManagerProps) {
  const logger = createLogger('EnhancedHostParticipantManager', 'admin');
  
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [currentCount, setCurrentCount] = useState(0);
  const [maxCount, setMaxCount] = useState(0);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Check if we can create a connection (prevent duplicates)
  const canCreateConnection = useCallback(() => {
    if (!conversationId || !enabled) return false;
    
    const existing = hostConnectionRegistry.get(conversationId);
    if (existing && existing.active && existing.timestamp > Date.now() - 5000) {
      logger.category('admin', `Skipping - active connection exists for conversation ${conversationId}`);
      return false;
    }
    
    return true;
  }, [conversationId, enabled, logger]);

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
      setPollingActive(false);
    }
    
    // Remove from registry
    if (conversationId) {
      hostConnectionRegistry.delete(conversationId);
      logger.category('admin', `Removed connection from registry for conversation ${conversationId}`);
    }
  }, [conversationId, logger]);

  // Process participant notifications from pg_notify
  const processParticipantNotification = useCallback((payload: string) => {
    startTiming('participant_notification_processing', { conversationId });
    
    try {
      const data = JSON.parse(payload);
      const timestamp = Date.now();
      
      // Prevent duplicate processing
      if (timestamp - lastUpdateRef.current < 100) {
        logger.category('admin', 'Skipping duplicate notification');
        endTiming('participant_notification_processing', { skipped: true });
        return;
      }
      lastUpdateRef.current = timestamp;
      
      markMilestone('participant_notification_received', data);
      logger.category('admin', 'Processing participant notification:', data);
      
      // Update current count immediately
      if (data.current_count !== undefined) {
        startTiming('participant_count_update');
        setCurrentCount(data.current_count);
        if (onParticipantCountChange) {
          onParticipantCountChange(data.current_count);
        }
        endTiming('participant_count_update', { newCount: data.current_count });
      }
      
      // Check for session full condition
      if (data.max_count && data.current_count >= data.max_count && onSessionFull) {
        markMilestone('session_full_detected', { count: data.current_count, max: data.max_count });
        logger.category('admin', `Session full detected: ${data.current_count}/${data.max_count}`);
        onSessionFull();
      }
      
      // Refresh participant list immediately  
      startTiming('participant_list_refresh');
      // Will be called after fetchParticipantList is defined
      
      endTiming('participant_notification_processing', { completed: true });
      
    } catch (error) {
      logger.category('admin', 'Error processing participant notification:', error);
      endTiming('participant_notification_processing', { error: true });
    }
  }, [onParticipantCountChange, onSessionFull, logger, conversationId]);

  // Process session start notifications
  const processSessionStartNotification = useCallback((payload: string) => {
    try {
      const data = JSON.parse(payload);
      logger.category('admin', 'Processing session start notification:', data);
      
      setIsSessionStarted(true);
      if (onSessionStarted) {
        onSessionStarted();
      }
      
    } catch (error) {
      logger.category('admin', 'Error processing session start notification:', error);
    }
  }, [onSessionStarted, logger]);

  // Fetch participant list
  const fetchParticipantList = useCallback(async () => {
    if (!conversationId) return;

    try {
      const { data: participantsData, error: participantsError } = await supabase
        .from('session_participants')
        .select('*')
        .eq('conversation_id', conversationId);

      if (participantsError) {
        logger.category('admin', 'Error fetching participants:', participantsError);
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
        
        logger.category('admin', `Updated participant list: ${updatedParticipants.length} participants`);
      }
    } catch (error) {
      logger.category('admin', 'Exception fetching participants:', error);
    }
  }, [conversationId, onParticipantsChange, logger]);

  // Fast polling fallback for critical updates
  const startFastPolling = useCallback(() => {
    if (!conversationId || fallbackIntervalRef.current) return;

    logger.category('admin', 'Starting fast polling fallback');
    setPollingActive(true);
    
    fallbackIntervalRef.current = setInterval(async () => {
      if (!mountedRef.current || !conversationId) return;

      try {
        // Fetch conversation data
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('current_participants, participants, session_started')
          .eq('id', conversationId)
          .single();

        if (convError) {
          logger.category('admin', 'Polling error:', convError);
          setPollingActive(false);
          setIsConnected(false);
          return;
        }

        if (convData) {
          const newCurrentCount = convData.current_participants || 0;
          const newMaxCount = convData.participants || 0;
          const sessionStarted = convData.session_started || false;
          
          setCurrentCount(newCurrentCount);
          setMaxCount(newMaxCount);
          setIsSessionStarted(sessionStarted);
          
          // Set connected when polling successfully fetches data
          setIsConnected(true);
          setError('Using polling updates (real-time unavailable)');
          
          if (onParticipantCountChange) {
            onParticipantCountChange(newCurrentCount);
          }
          if (onMaxParticipantsChange) {
            onMaxParticipantsChange(newMaxCount);
          }
          
          // Fetch participant list
          await fetchParticipantList();
        }
      } catch (error) {
        logger.category('admin', 'Exception during polling:', error);
        setPollingActive(false);
        setIsConnected(false);
        setError('Connection failed');
      }
    }, 5000); // 5 second polling instead of 30 seconds
  }, [conversationId, onParticipantCountChange, onMaxParticipantsChange, fetchParticipantList, logger]);

  // Setup enhanced realtime subscription
  const setupEnhancedSubscription = useCallback(() => {
    if (!conversationId || !mountedRef.current || !enabled || !canCreateConnection()) {
      return;
    }

    logger.category('admin', `Setting up enhanced host subscription for conversation ${conversationId}`);
    
    // Register this connection
    hostConnectionRegistry.set(conversationId, {
      active: true,
      timestamp: Date.now(),
      channelRef: null
    });
    
    cleanup();
    setError(null);
    
    const channelName = `enhanced-host-${conversationId}-${Date.now()}`;
    
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
          
          logger.category('admin', 'Enhanced conversation update:', payload);
          
          if (payload.new) {
            const newCurrentCount = payload.new.current_participants || 0;
            const newMaxCount = payload.new.participants || 0;
            const sessionStarted = payload.new.session_started || false;
            
            setCurrentCount(newCurrentCount);
            setMaxCount(newMaxCount);
            setIsSessionStarted(sessionStarted);
            
            if (onParticipantCountChange) {
              onParticipantCountChange(newCurrentCount);
            }
            if (onMaxParticipantsChange) {
              onMaxParticipantsChange(newMaxCount);
            }
            if (sessionStarted && onSessionStarted) {
              onSessionStarted();
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
          
          logger.category('admin', 'Enhanced participant change:', payload);
          
          // Refresh participant list immediately
          fetchParticipantList();
        })
        // Listen to PostgreSQL notifications
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: '*'
        }, () => {}) // This enables the channel to receive pg_notify messages
        .subscribe((status) => {
          if (!mountedRef.current) return;
          
          logger.category('admin', `Enhanced channel status: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setError(null);
            
            // Update registry
            const existing = hostConnectionRegistry.get(conversationId);
            if (existing) {
              existing.channelRef = channel;
            }
            
            // Stop fast polling if realtime is working
            if (fallbackIntervalRef.current) {
              clearInterval(fallbackIntervalRef.current);
              fallbackIntervalRef.current = null;
              setPollingActive(false);
            }
            
            // Set up pg_notify listeners
            channel.send({
              type: 'postgres_changes',
              event: 'pg_notify',
              filters: [
                { event: 'participant_joined', callback: processParticipantNotification },
                { event: 'participant_left', callback: processParticipantNotification },
                { event: 'session_auto_started', callback: processSessionStartNotification }
              ]
            });
            
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            logger.category('admin', 'Enhanced channel error, starting fast polling');
            setIsConnected(false);
            setError('Real-time connection failed, switching to polling...');
            
            startFastPolling();
            
            // Single retry for hosts to prevent conflicts
            retryTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                logger.category('admin', 'Retrying enhanced connection');
                setupEnhancedSubscription();
              }
            }, 3000);
            
          } else if (status === 'CLOSED') {
            setIsConnected(false);
          }
        });
        
      channelRef.current = channel;
    } catch (error) {
      logger.category('admin', 'Error creating enhanced channel:', error);
      setError("Failed to establish enhanced connection");
      startFastPolling();
    }
  }, [conversationId, enabled, canCreateConnection, cleanup, onParticipantCountChange, onMaxParticipantsChange, onSessionStarted, fetchParticipantList, processParticipantNotification, processSessionStartNotification, startFastPolling, logger]);

  // Initial data fetch
  const fetchInitialData = useCallback(async () => {
    if (!conversationId || !enabled || !canCreateConnection()) return;

    try {
      // Fetch conversation data
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('current_participants, participants, session_started')
        .eq('id', conversationId)
        .single();

      if (convError) {
        logger.category('admin', 'Error fetching initial conversation data:', convError);
        return;
      }

      if (convData) {
        const initialCurrentCount = convData.current_participants || 0;
        const initialMaxCount = convData.participants || 0;
        const sessionStarted = convData.session_started || false;
        
        setCurrentCount(initialCurrentCount);
        setMaxCount(initialMaxCount);
        setIsSessionStarted(sessionStarted);
        
        if (onParticipantCountChange) {
          onParticipantCountChange(initialCurrentCount);
        }
        if (onMaxParticipantsChange) {
          onMaxParticipantsChange(initialMaxCount);
        }
      }

      // Fetch participants
      await fetchParticipantList();
      
    } catch (error) {
      logger.category('admin', 'Exception during initial data fetch:', error);
    }
  }, [conversationId, enabled, canCreateConnection, onParticipantCountChange, onMaxParticipantsChange, fetchParticipantList, logger]);

  // Setup effect
  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled && conversationId) {
      fetchInitialData();
      setupEnhancedSubscription();
    }
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [conversationId, enabled, fetchInitialData, setupEnhancedSubscription, cleanup]);

  // Manual reconnection
  const reconnect = useCallback(() => {
    setupEnhancedSubscription();
  }, [setupEnhancedSubscription]);

  return {
    isConnected,
    error,
    reconnect,
    participants,
    currentCount,
    maxCount,
    isSessionStarted,
    // Expose refresh function for manual updates
    refresh: fetchInitialData
  };
}