
import { useEffect } from "react";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";

/**
 * Hook to ensure admin status is maintained throughout the session
 */
export function useAdminStatusPersistence() {
  const { setAdminStatus } = useSessionAdminStatus();
  
  useEffect(() => {
    // Set admin status once
    setAdminStatus(true);
    
    // No need for interval checks anymore - our hook handles persistence
  }, [setAdminStatus]);
  
  return { forceAdmin: true };
}
