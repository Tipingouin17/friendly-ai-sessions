/**
 * use Effective Admin Status
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface UseEffectiveAdminStatusProps {
  forceAdmin?: boolean;
  locationState: any;
  persistedParticipantData?: any;
}

/**
 * Hook to determine the effective admin status from all possible sources
 */
export function useEffectiveAdminStatus({
  forceAdmin,
  locationState,
  persistedParticipantData
}: UseEffectiveAdminStatusProps): boolean {
  useEffect(() => {
  }, []);

  const location = useLocation();
  
  // Combined admin detection from all possible sources
  return Boolean(
    forceAdmin === true || 
    locationState?.isAdmin === true ||
    persistedParticipantData?.isAdmin === true ||
    sessionStorage.getItem('isAdminSession') === 'true' ||
    location.pathname.includes('/admin')
  );
}
