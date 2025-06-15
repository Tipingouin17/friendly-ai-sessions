
import { useEffect } from 'react';
import { useSessionHostStatus } from './useSessionHostStatus';

export function useHostStatusPersistence() {
  const { setHostStatus } = useSessionHostStatus();

  // Force host status for host routes
  const forceHost = () => {
    console.log("Forcing host status for session host page");
    setHostStatus(true);
  };

  useEffect(() => {
    // Check if we're on a host path
    const isHostPath = window.location.pathname.includes('/host');
    if (isHostPath) {
      forceHost();
    }
  }, []);

  return {
    forceHost
  };
}
