
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function useSessionAdminStatus() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const isInitialized = useRef(false);
  
  // Determine if user is admin
  useEffect(() => {
    // Only run once to prevent state inconsistency
    if (isInitialized.current) return;
    
    const locationState = location.state as { 
      isGuest?: boolean; 
      showMessaging?: boolean;
      isAdmin?: boolean;
      newConversationId?: number;
    } | null;
    
    // User is considered admin if:
    // 1. They're explicitly marked as admin in the state
    // 2. They're not a guest (implying they created the session)
    // 3. They have a newConversationId (implying they created it)
    const adminStatus = Boolean(locationState?.isAdmin) || 
      (locationState?.isGuest !== true) || 
      Boolean(locationState?.newConversationId);
    
    console.log(`Setting admin status to ${adminStatus} based on:`, locationState);
    setIsAdmin(adminStatus);
    isInitialized.current = true;
  }, [location]);

  return { isAdmin };
}
