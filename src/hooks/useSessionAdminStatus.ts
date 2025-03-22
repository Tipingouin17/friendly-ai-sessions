
import { useState, useEffect } from "react";

export function useSessionAdminStatus() {
  const [isAdmin, setIsAdmin] = useState(() => {
    // Check sessionStorage for admin status on initialization
    return sessionStorage.getItem('isAdminSession') === 'true';
  });

  // Update admin status and persist it to sessionStorage
  const setAdminStatus = (status: boolean) => {
    setIsAdmin(status);
    if (status) {
      sessionStorage.setItem('isAdminSession', 'true');
    } else {
      sessionStorage.removeItem('isAdminSession');
    }
  };

  // Effect to synchronize with sessionStorage changes (for multi-tab support)
  useEffect(() => {
    const handleStorageChange = () => {
      const adminStatus = sessionStorage.getItem('isAdminSession') === 'true';
      if (adminStatus !== isAdmin) {
        setIsAdmin(adminStatus);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isAdmin]);

  return { isAdmin, setAdminStatus };
}
