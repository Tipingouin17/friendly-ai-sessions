
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useSessionAdminStatus() {
  const location = useLocation();
  const isOnAdminPath = location.pathname.includes('/admin');
  
  // Initialize state once and read from sessionStorage only during initialization
  const [isAdmin, setIsAdmin] = useState(() => {
    // For admin paths, always return true
    if (isOnAdminPath) {
      return true;
    }
    
    // For non-admin paths, check session storage
    return sessionStorage.getItem('isAdminSession') === 'true';
  });

  // Update admin status in sessionStorage when isAdmin changes
  useEffect(() => {
    if (isAdmin) {
      sessionStorage.setItem('isAdminSession', 'true');
    } else if (sessionStorage.getItem('isAdminSession') === 'true') {
      // Only remove if it exists (prevents unnecessary storage operations)
      sessionStorage.removeItem('isAdminSession');
    }
  }, [isAdmin]);

  // When on admin paths, ensure admin status is true
  useEffect(() => {
    if (isOnAdminPath && !isAdmin) {
      setIsAdmin(true);
    }
  }, [isOnAdminPath, isAdmin]);

  // Simplified setter function that doesn't cause loops
  const setAdminStatus = (status: boolean) => {
    if (status !== isAdmin) {
      setIsAdmin(status);
    }
  };

  return { isAdmin, setAdminStatus };
}
