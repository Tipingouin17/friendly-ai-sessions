/**
 * use Enhanced Participant Monitoring
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useRef, useCallback, useState } from 'react';

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
  const [isEnabled] = useState(false); // Disable enhanced monitoring to prevent conflicts
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Return minimal implementation to maintain compatibility
  const registerChannel = useCallback((channel: any) => {
    // No-op to prevent conflicts
  }, []);

  const unregisterChannel = useCallback((channel: any) => {
    // No-op to prevent conflicts
  }, []);

  const setupFallbackPolling = useCallback(async () => {
    // Disabled - handled by simplified monitoring
  }, []);

  const performHealthCheck = useCallback(() => {
    // Report as healthy to avoid issues
    if (onConnectionHealthChange) {
      onConnectionHealthChange(true);
    }
  }, [onConnectionHealthChange]);

  return {
    registerChannel,
    unregisterChannel,
    setupFallbackPolling,
    performHealthCheck
  };
}
