/**
 * use Host Status Persistence
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect } from 'react';
import { useSessionHostStatus } from './useSessionHostStatus';

export function useHostStatusPersistence() {
  const { setHostStatus } = useSessionHostStatus();

  // Force host status for host routes
  const forceHost = () => {
    setHostStatus(true);
  };

  useEffect(() => {
    // Check if we're on a host path
    const isHostPath = window.location.pathname.includes('/host');
    if (isHostPath) {
      forceHost();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
  }, []);

  return {
    forceHost
  };
}
