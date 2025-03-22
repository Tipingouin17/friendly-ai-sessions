
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function useSessionAdminStatus() {
  const location = useLocation();
  const isOnAdminPath = location.pathname.includes('/admin');
  const adminStatusSetRef = useRef(false);
  
  // Initialize admin status once, avoiding re-renders
  const [isAdmin, setIsAdmin] = useState(() => {
    // Priority for initialization:
    // 1. Check URL path - most reliable
    // 2. Check session storage
    // 3. Default to false
    const initialStatus = isOnAdminPath || sessionStorage.getItem('isAdminSession') === 'true';
    return initialStatus;
  });
  
  // Store if we already set admin status to prevent repeated updates
  const hasSetAdminStatus = useRef(false);
  
  // Track initial state to avoid unnecessary updates
  const initialAdminState = useRef(isAdmin);

  // Update admin status and persist it to sessionStorage, with guards against infinite updates
  const setAdminStatus = (status: boolean) => {
    // Skip if we're already in this state
    if (status === isAdmin) return;
    
    // Guard against too many updates
    if (adminStatusSetRef.current) return;
    adminStatusSetRef.current = true;
    
    // Only update state if actually changing and not during initial render
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
      adminStatusSetRef.current = false;
    }, 50);
  };

  // Apply admin status from URL path - this should only run once
  useEffect(() => {
    if (isOnAdminPath && !hasSetAdminStatus.current) {
      hasSetAdminStatus.current = true;
      
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
