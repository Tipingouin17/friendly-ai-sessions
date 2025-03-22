
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function useSessionAdminStatus() {
  const location = useLocation();
  const isOnAdminPath = location.pathname.includes('/admin');
  
  // Initialize admin status once, avoiding re-renders
  const [isAdmin, setIsAdmin] = useState(() => {
    // Priority for initialization:
    // 1. Check URL path - most reliable
    // 2. Check session storage
    // 3. Default to false
    return isOnAdminPath || sessionStorage.getItem('isAdminSession') === 'true';
  });
  
  // Store if we already set admin status to prevent repeated updates
  const hasSetAdminStatus = useRef(false);

  // Update admin status and persist it to sessionStorage, with guards against infinite updates
  const setAdminStatus = (status: boolean) => {
    // Only update state if actually changing
    if (status !== isAdmin) {
      setIsAdmin(status);
    }
    
    // Only update storage if needed
    if (status && sessionStorage.getItem('isAdminSession') !== 'true') {
      sessionStorage.setItem('isAdminSession', 'true');
    } else if (!status && sessionStorage.getItem('isAdminSession') === 'true') {
      sessionStorage.removeItem('isAdminSession');
    }
  };

  // Apply admin status from URL path - this should only run once
  useEffect(() => {
    if (isOnAdminPath && !hasSetAdminStatus.current) {
      hasSetAdminStatus.current = true;
      if (!isAdmin) {
        setIsAdmin(true);
      }
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [isOnAdminPath, isAdmin]);

  return { isAdmin, setAdminStatus };
}
