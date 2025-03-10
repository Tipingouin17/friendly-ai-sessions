
import { useEffect } from "react";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";

/**
 * Hook to ensure admin status is maintained throughout the session
 */
export function useAdminStatusPersistence() {
  const { setAdminStatus } = useSessionAdminStatus();
  
  useEffect(() => {
    // Set admin status immediately
    sessionStorage.setItem('isAdminSession', 'true');
    setAdminStatus(true);
    
    // Create a safety timer to regularly check and enforce admin status
    const adminCheckInterval = setInterval(() => {
      // Re-establish admin status in case it got lost
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
    }, 2000);
    
    return () => {
      clearInterval(adminCheckInterval);
    };
  }, [setAdminStatus]);
  
  return { forceAdmin: true };
}
