/**
 * use Admin Status Persistence
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useRef } from "react";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";

/**
 * Hook to ensure admin status is maintained throughout the session
 * Simplified to prevent render loops
 */
export function useAdminStatusPersistence() {
  const { setAdminStatus } = useSessionAdminStatus();
  const hasSetAdmin = useRef(false);
  
  useEffect(() => {
    // Set admin status once and only once
    if (!hasSetAdmin.current) {
      hasSetAdmin.current = true;
      setAdminStatus(true);
    }
  }, [setAdminStatus]);
  
  return { forceAdmin: true };
}
