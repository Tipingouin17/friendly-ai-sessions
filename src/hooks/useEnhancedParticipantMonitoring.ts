
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseEnhancedParticipantMonitoringProps {
  conversationId: number | null;
  onParticipantCountChange?: (count: number) => void;
  onConnectionHealthChange?: (isHealthy: boolean) => void;
}

export function useEnhancedParticipantMonitoring({
  conversationId,
  onParticipantCountChange,
  onConnectionHealthChange
}: UseEnhancedParticipantMonitoringProps) {
  const healthCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const channelsRef = useRef<any[]>([]);
  const mountedRef = useRef(true);

  // Health check function
  const performHealthCheck = useCallback(() => {
    if (!mountedRef.current) return;

    const activeChannels = channelsRef.current.filter(channel => 
      channel && channel.state === 'joined'
    );
    
    const isHealthy = activeChannels.length > 0;
    
    console.log('Participant monitoring health check:', {
      totalChannels: channelsRef.current.length,
      activeChannels: activeChannels.length,
      isHealthy
    });

    if (onConnectionHealthChange) {
      onConnectionHealthChange(isHealthy);
    }
  }, [onConnectionHealthChange]);

  // Fallback polling mechanism
  const setupFallbackPolling = useCallback(async () => {
    if (!conversationId || !mountedRef.current) return;

    console.log('Setting up fallback polling for participant count');
    
    const pollInterval = setInterval(async () => {
      if (!mountedRef.current) {
        clearInterval(pollInterval);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('current_participants')
          .eq('id', conversationId)
          .single();

        if (error) {
          console.error('Fallback polling error:', error);
          return;
        }

        if (onParticipantCountChange && typeof data.current_participants === 'number') {
          onParticipantCountChange(data.current_participants);
        }
      } catch (error) {
        console.error('Exception during fallback polling:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [conversationId, onParticipantCountChange]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Start health monitoring
    healthCheckInterval.current = setInterval(performHealthCheck, 10000); // Check every 10 seconds
    
    // Initial health check
    performHealthCheck();

    return () => {
      mountedRef.current = false;
      if (healthCheckInterval.current) {
        clearInterval(healthCheckInterval.current);
      }
    };
  }, [performHealthCheck]);

  // Track channels for health monitoring
  const registerChannel = useCallback((channel: any) => {
    if (channel) {
      channelsRef.current.push(channel);
    }
  }, []);

  const unregisterChannel = useCallback((channel: any) => {
    if (channel) {
      channelsRef.current = channelsRef.current.filter(c => c !== channel);
    }
  }, []);

  return {
    registerChannel,
    unregisterChannel,
    setupFallbackPolling,
    performHealthCheck
  };
}
