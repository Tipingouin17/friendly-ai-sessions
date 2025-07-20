
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

// Enhanced global connection registry with better conflict prevention
const hostConnectionRegistry = new Map<number, {
  active: boolean;
  timestamp: number;
  channelRef: any;
  instanceId: string;
}>();

// Cleanup stale connections more aggressively
const STALE_CONNECTION_TIMEOUT = 30000; // 30 seconds
const CONNECTION_DEBOUNCE_TIME = 2000; // 2 seconds between connection attempts

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
  const instanceId = useRef<string>(Math.random().toString(36).substr(2, 9));
  const lastStateRef = useRef({ currentCount: 0, maxCount: 0, participants: [] as ParticipantInfo[] });

  // Check if we can create a connection with better deduplication
  const canCreateConnection = useCallback(() => {
    if (!conversationId || !enabled) return false;
    
    const existing = hostConnectionRegistry.get(conversationId);
    const now = Date.now();
    
    if (existing && existing.active && (now - existing.timestamp) < CONNECTION_DEBOUNCE_TIME) {
      if (existing.instanceId !== instanceId.current) {
        logger.category('admin', `Skipping - active connection exists for conversation ${conversationId} (instance: ${existing.instanceId})`);
        return false;
      }
    }
    
    // Clean up stale connections
    if (existing && (now - existing.timestamp) > STALE_CONNECTION_TIMEOUT) {
      hostConnectionRegistry.delete(conversationId);
      logger.category('admin', `Cleaned up stale connection for conversation ${conversationId}`);
    }
    
    return true;
  }, [conversationId, enabled, logger]);

  // Debounced state update function to prevent rapid updates
  const updateStateWithDebounce = useCallback((
    newCurrentCount?: number,
    newMaxCount?: number,
    newParticipants?: ParticipantInfo[]
  ) => {
    const now = Date.now();
    
    // Prevent updates that are too frequent
    if (now - lastUpdateRef.current < 1000) { // 1 second debounce
      return;
    }

    let hasChanges = false;

    // Only update if values actually changed
    if (newCurrentCount !== undefined && newCurrentCount !== lastStateRef.current.currentCount) {
      setCurrentCount(newCurrentCount);
      lastStateRef.current.currentCount = newCurrentCount;
      if (onParticipantCountChange) {
        onParticipantCountChange(newCurrentCount);
      }
      hasChanges = true;
    }

    if (newMaxCount !== undefined && newMaxCount !== lastStateRef.current.maxCount) {
      setMaxCount(newMaxCount);
      lastStateRef.current.maxCount = newMaxCount;
      if (onMaxParticipantsChange) {
        onMaxParticipantsChange(newMaxCount);
      }
      hasChanges = true;
    }

    if (newParticipants && JSON.stringify(newParticipants) !== JSON.stringify(lastStateRef.current.participants)) {
      setParticipants(newParticipants);
      lastStateRef.current.participants = newParticipants;
      if (onParticipantsChange) {
        onParticipantsChange(newParticipants);
      }
      hasChanges = true;
    }

    if (hasChanges) {
      lastUpdateRef.current = now;
      logger.category('admin', `State updated: count=${newCurrentCount}, max=${newMaxCount}, participants=${newParticipants?.length || 'unchanged'}`);
    }
  }, [onParticipantCountChange, onMaxParticipantsChange, onParticipantsChange, logger]);

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
    
    // Remove from registry only if it's our instance
    if (conversationId) {
      const existing = hostConnectionRegistry.get(conversationId);
      if (existing && existing.instanceId === instanceId.current) {
        hostConnectionRegistry.delete(conversationId);
        logger.category('admin', `Removed connection from registry for conversation ${conversationId} (instance: ${instanceId.current})`);
      }
    }
  }, [conversationId, logger]);

  // Process participant notifications from pg_notify
  const processParticipantNotification = useCallback((payload: string) => {
    startTiming('participant_notification_processing', { conversationId });
    
    try {
      const data = JSON.parse(payload);
      markMilestone('participant_notification_received', data);
      
      // Use debounced state update
      updateStateWithDebounce(data.current_count, data.max_count);
      
      // Check for session full condition with proper debouncing
      if (data.max_count && data.current_count >= data.max_count && onSessionFull) {
        const now = Date.now();
        if (now - lastUpdateRef.current > 5000) { // 5 second cooldown for session full
          markMilestone('session_full_detected', { count: data.current_count, max: data.max_count });
          logger.category('admin', `Session full detected: ${data.current_count}/${data.max_count}`);
          onSessionFull();
        }
      }
      
      endTiming('participant_notification_processing', { completed: true });
      
    } catch (error) {
      logger.category('admin', 'Error processing participant notification:', error);
      endTiming('participant_notification_processing', { error: true });
    }
  }, [updateStateWithDebounce, onSessionFull, logger, conversationId]);

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

  // Fetch participant list with caching
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
        
        // Use debounced state update
        updateStateWithDebounce(undefined, undefined, updatedParticipants);
      }
    } catch (error) {
      logger.category('admin', 'Exception fetching participants:', error);
    }
  }, [conversationId, updateStateWithDebounce, logger]);

  // Reduced frequency polling fallback
  const startFastPolling = useCallback(() => {
    if (!conversationId || fallbackIntervalRef.current) return;

    logger.category('admin', 'Starting reduced frequency polling fallback');
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
          return;
        }

        if (convData) {
          const newCurrentCount = convData.current_participants || 0;
          const newMaxCount = convData.participants || 0;
          const sessionStarted = convData.session_started || false;
          
          // Use debounced state update
          updateStateWithDebounce(newCurrentCount, newMaxCount);
          setIsSessionStarted(sessionStarted);
          
          // Set connected when polling successfully fetches data
          setIsConnected(true);
          setError('Using polling updates (real-time unavailable)');
          
          // Fetch participant list
          await fetchParticipantList();
        }
      } catch (error) {
        logger.category('admin', 'Exception during polling:', error);
      }
    }, 15000); // Increased to 15 seconds to reduce server load
  }, [conversationId, updateStateWithDebounce, fetchParticipantList, logger]);

  // Setup enhanced realtime subscription with better connection management
  const setupEnhancedSubscription = useCallback(() => {
    if (!conversationId || !mountedRef.current || !enabled || !canCreateConnection()) {
      return;
    }

    logger.category('admin', `Setting up enhanced host subscription for conversation ${conversationId} (instance: ${instanceId.current})`);
    
    // Register this connection with instance tracking
    hostConnectionRegistry.set(conversationId, {
      active: true,
      timestamp: Date.now(),
      channelRef: null,
      instanceId: instanceId.current
    });
    
    cleanup();
    setError(null);
    
    const channelName = `enhanced-host-${conversationId}-${instanceId.current}-${Date.now()}`;
    
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
            
            updateStateWithDebounce(newCurrentCount, newMaxCount);
            setIsSessionStarted(sessionStarted);
            
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
          
          // Refresh participant list with debouncing
          setTimeout(() => {
            if (mountedRef.current) {
              fetchParticipantList();
            }
          }, 500); // Debounce participant list refresh
        })
        .subscribe((status) => {
          if (!mountedRef.current) return;
          
          logger.category('admin', `Enhanced channel status: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setError(null);
            
            // Update registry
            const existing = hostConnectionRegistry.get(conversationId);
            if (existing && existing.instanceId === instanceId.current) {
              existing.channelRef = channel;
            }
            
            // Stop fast polling if realtime is working
            if (fallbackIntervalRef.current) {
              clearInterval(fallbackIntervalRef.current);
              fallbackIntervalRef.current = null;
              setPollingActive(false);
            }
            
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            logger.category('admin', 'Enhanced channel error, starting reduced polling');
            setIsConnected(false);
            setError('Real-time connection failed, using polling...');
            
            startFastPolling();
            
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
  }, [conversationId, enabled, canCreateConnection, cleanup, updateStateWithDebounce, onSessionStarted, fetchParticipantList, startFastPolling, logger]);

  // Initial data fetch with proper state initialization
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
        
        // Initialize state properly
        updateStateWithDebounce(initialCurrentCount, initialMaxCount);
        setIsSessionStarted(sessionStarted);
      }

      // Fetch participants
      await fetchParticipantList();
      
    } catch (error) {
      logger.category('admin', 'Exception during initial data fetch:', error);
    }
  }, [conversationId, enabled, canCreateConnection, updateStateWithDebounce, fetchParticipantList, logger]);

  // Setup effect with proper cleanup
  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled && conversationId) {
      fetchInitialData();
      
      // Delay subscription setup to prevent rapid connections
      const setupTimeout = setTimeout(() => {
        if (mountedRef.current) {
          setupEnhancedSubscription();
        }
      }, 1000);
      
      return () => {
        clearTimeout(setupTimeout);
      };
    }
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [conversationId, enabled, fetchInitialData, setupEnhancedSubscription, cleanup]);

  // Manual reconnection
  const reconnect = useCallback(() => {
    logger.category('admin', 'Manual reconnection requested');
    setupEnhancedSubscription();
  }, [setupEnhancedSubscription, logger]);

  return {
    isConnected,
    error,
    reconnect,
    participants,
    currentCount,
    maxCount,
    isSessionStarted,
    // Expose refresh function for manual updates
    refresh: fetchInitialData,
    pollingActive
  };
}
