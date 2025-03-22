
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function useSessionAdminStatus() {
  const location = useLocation();
  const isOnAdminPath = location.pathname.includes('/admin');
  
  // Use a single ref to track admin status updates to prevent infinite loops
  const statusUpdateRef = useRef({
    adminStatusSetRef: false,
    hasSetAdminStatus: false,
    initialAdminState: false
  });
  
  // Initialize admin status once, avoiding re-renders
  const [isAdmin, setIsAdmin] = useState(() => {
    // Priority for initialization:
    // 1. Check URL path - most reliable
    // 2. Check session storage
    // 3. Default to false
    const initialStatus = isOnAdminPath || sessionStorage.getItem('isAdminSession') === 'true';
    statusUpdateRef.current.initialAdminState = initialStatus;
    return initialStatus;
  });

  // Update admin status and persist it to sessionStorage, with guards against infinite updates
  const setAdminStatus = (status: boolean) => {
    // Skip if we're already in this state
    if (status === isAdmin) return;
    
    // Guard against too many updates
    if (statusUpdateRef.current.adminStatusSetRef) return;
    statusUpdateRef.current.adminStatusSetRef = true;
    
    // Only update state if actually changing
    setIsAdmin(status);
    
    // Update session storage only when needed
    const currentStorageValue = sessionStorage.getItem('isAdminSession');
    if (status && currentStorageValue !== 'true') {
      sessionStorage.setItem('isAdminSession', 'true');
    } else if (!status && currentStorageValue === 'true') {
      sessionStorage.removeItem('isAdminSession');
    }
    
    // Reset the guard after a small delay to allow future updates
    setTimeout(() => {
      statusUpdateRef.current.adminStatusSetRef = false;
    }, 100);
  };

  // Apply admin status from URL path - this should only run once
  useEffect(() => {
    if (isOnAdminPath && !statusUpdateRef.current.hasSetAdminStatus) {
      statusUpdateRef.current.hasSetAdminStatus = true;
      
      // Only update if we need to change the state
      if (!isAdmin) {
        setIsAdmin(true);
      }
      
      // Ensure consistent storage state
      if (sessionStorage.getItem('isAdminSession') !== 'true') {
        sessionStorage.setItem('isAdminSession', 'true');
      }
    }
  }, [isOnAdminPath, isAdmin]);

  return { isAdmin, setAdminStatus };
}
