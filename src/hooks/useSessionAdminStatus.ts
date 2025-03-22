
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Hook to manage admin status with prevention of infinite loops
 */
export function useSessionAdminStatus() {
  const location = useLocation();
  const isOnAdminPath = location.pathname.includes('/admin');
  const hasInitialized = useRef(false);
  
  // Get initial admin status from session storage only once during initialization
  const [isAdmin, setIsAdmin] = useState(() => {
    // For admin paths, always return true
    if (isOnAdminPath) {
      return true;
    }
    
    // For non-admin paths, check session storage
    return sessionStorage.getItem('isAdminSession') === 'true';
  });

  // We use a separate function to update session storage to avoid loops
  const persistAdminStatus = useCallback((status: boolean) => {
    if (status) {
      if (sessionStorage.getItem('isAdminSession') !== 'true') {
        sessionStorage.setItem('isAdminSession', 'true');
      }
    } else {
      if (sessionStorage.getItem('isAdminSession') === 'true') {
        sessionStorage.removeItem('isAdminSession');
      }
    }
  }, []);

  // Update session storage when admin status changes, but only once
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      persistAdminStatus(isAdmin);
    }
  }, [isAdmin, persistAdminStatus]);

  // When on admin paths, ensure admin status is true
  useEffect(() => {
    if (isOnAdminPath && !isAdmin) {
      setIsAdmin(true);
      persistAdminStatus(true);
    }
  }, [isOnAdminPath, isAdmin, persistAdminStatus]);

  // Provide a safe way to update admin status without causing loops
  const setAdminStatus = useCallback((status: boolean) => {
    if (status !== isAdmin) {
      setIsAdmin(status);
      persistAdminStatus(status);
    }
  }, [isAdmin, persistAdminStatus]);

  return { isAdmin, setAdminStatus };
}
