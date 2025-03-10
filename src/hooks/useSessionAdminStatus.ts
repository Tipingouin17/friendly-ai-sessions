
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function useSessionAdminStatus() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const isInitialized = useRef(false);
  
  // Determine if user is admin - improved with more reliable detection
  useEffect(() => {
    // Only run once to prevent state inconsistency
    if (isInitialized.current) return;
    
    const locationState = location.state as { 
      isGuest?: boolean; 
      showMessaging?: boolean;
      isAdmin?: boolean;
      newConversationId?: number;
    } | null;
    
    const searchParams = new URLSearchParams(location.search);
    const isAdminParam = searchParams.get('admin') === 'true';
    const isAdminPath = location.pathname.includes('/admin');
    
    // More robust admin detection with clear precedence:
    // 1. Check if we're on the /session/admin path or any path with 'admin'
    // 2. Explicit isAdmin flag in state or query param 
    // 3. If isGuest is false, user is admin (session creator)
    // 4. Having newConversationId implies user created the session 
    let adminStatus = false;
    
    if (isAdminPath) {
      adminStatus = true;
    } else if (locationState?.isAdmin === true || isAdminParam) {
      adminStatus = true;
    } else if (locationState?.isGuest === false) {
      adminStatus = true;
    } else if (locationState?.newConversationId) {
      adminStatus = true;
    } else {
      // Not explicitly marked as admin or guest, default to non-admin
      adminStatus = false;
    }
    
    console.log(`Setting admin status to ${adminStatus} based on state:`, 
      JSON.stringify({
        path: location.pathname,
        isAdminPath,
        isAdminInState: locationState?.isAdmin,
        isAdminInQuery: isAdminParam,
        isGuest: locationState?.isGuest,
        hasNewConversationId: Boolean(locationState?.newConversationId)
      })
    );
    
    setIsAdmin(adminStatus);
    isInitialized.current = true;
  }, [location]);

  return { isAdmin };
}
