
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function useSessionAdminStatus() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const isInitialized = useRef(false);
  
  // Determine if user is admin - improved with more reliable detection and persistence
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
    
    // Check if we've stored admin status in sessionStorage
    const storedAdminStatus = sessionStorage.getItem('isAdminSession');
    
    // More robust admin detection with clear precedence:
    // 0. Check sessionStorage for persistence
    // 1. Check if we're on the /admin path
    // 2. Explicit isAdmin flag in state or query param 
    // 3. If isGuest is false, user is admin (session creator)
    // 4. Having newConversationId implies user created the session 
    let adminStatus = false;
    
    if (storedAdminStatus === 'true') {
      adminStatus = true;
      console.log("Admin status set to true based on sessionStorage");
    } else if (isAdminPath) {
      adminStatus = true;
      console.log("Admin status set to true based on admin path");
    } else if (locationState?.isAdmin === true || isAdminParam) {
      adminStatus = true;
      console.log("Admin status set to true based on state or query param");
    } else if (locationState?.isGuest === false) {
      adminStatus = true;
      console.log("Admin status set to true based on not being a guest");
    } else if (locationState?.newConversationId) {
      adminStatus = true;
      console.log("Admin status set to true based on having newConversationId");
    } else {
      // Not explicitly marked as admin or guest, default to non-admin
      adminStatus = false;
      console.log("Admin status set to false as no admin indicators found");
    }
    
    console.log(`Setting admin status to ${adminStatus} based on state:`, 
      JSON.stringify({
        path: location.pathname,
        isAdminPath,
        isAdminInState: locationState?.isAdmin,
        isAdminInQuery: isAdminParam,
        isGuest: locationState?.isGuest,
        hasNewConversationId: Boolean(locationState?.newConversationId),
        storedAdminStatus
      })
    );
    
    // Store in sessionStorage if admin
    if (adminStatus) {
      sessionStorage.setItem('isAdminSession', 'true');
    }
    
    setIsAdmin(adminStatus);
    isInitialized.current = true;
  }, [location]);

  return { isAdmin };
}
