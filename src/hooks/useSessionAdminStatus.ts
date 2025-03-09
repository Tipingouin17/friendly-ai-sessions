
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useSessionAdminStatus() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Determine if user is admin
  useEffect(() => {
    const locationState = location.state as { 
      isGuest?: boolean; 
      showMessaging?: boolean;
      isAdmin?: boolean;
    } | null;
    
    // User is considered admin if:
    // 1. They're explicitly marked as admin in the state
    // 2. They're not a guest (implying they created the session)
    // 3. They're not accessing via the join flow
    const adminStatus = Boolean(locationState?.isAdmin) || 
      (locationState?.isGuest !== true);
    
    setIsAdmin(adminStatus);
    console.log("Session page - isAdmin determined as:", adminStatus, "from state:", locationState);
  }, [location]);

  return { isAdmin };
}
