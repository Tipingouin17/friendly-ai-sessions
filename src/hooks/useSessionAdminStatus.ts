
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function useSessionAdminStatus() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const isInitialized = useRef(false);
  
  // Determine if user is admin - improved with more reliable detection and storage separation
  useEffect(() => {
    // Check if on admin route - this is the most reliable indicator
    const isAdminPath = location.pathname.includes('/admin');
    const adminStorageKey = 'isAdminSession';
    
    // If we're explicitly on the admin path, always set admin to true immediately
    if (isAdminPath && !isAdmin) {
      console.log("Setting admin=true based on admin path");
      setIsAdmin(true);
      sessionStorage.setItem(adminStorageKey, 'true');
      return;
    }
    
    // Only run once to prevent state inconsistency if not on admin path
    if (isInitialized.current) return;
    
    const locationState = location.state as { 
      isGuest?: boolean; 
      showMessaging?: boolean;
      isAdmin?: boolean;
      newConversationId?: number;
    } | null;
    
    const searchParams = new URLSearchParams(location.search);
    const isAdminParam = searchParams.get('admin') === 'true';
    
    // Check if we've stored admin status in sessionStorage
    const storedAdminStatus = sessionStorage.getItem(adminStorageKey);
    
    // Ensure we're not leaking admin status from previous sessions
    const currentPath = location.pathname;
    
    // Special handling for admin URL paths - they should always retain admin status
    if (currentPath.includes('/admin')) {
      console.log("Admin path detected, enforcing admin status");
      setIsAdmin(true);
      sessionStorage.setItem(adminStorageKey, 'true');
      isInitialized.current = true;
      return;
    }
    
    if (!currentPath.includes('/admin') && !currentPath.includes('/session')) {
      // If not on admin or session path, clear any stored admin status
      if (storedAdminStatus === 'true') {
        console.log("Clearing admin status when not on session or admin path");
        sessionStorage.removeItem(adminStorageKey);
      }
    }
    
    // CRITICAL FIX: Add path-specific storage to prevent non-admin/admin session conflicts
    const isParticipantPath = currentPath.includes('/session') && !currentPath.includes('/admin');
    if (isParticipantPath) {
      // Participants should only get admin status from their specific state or params
      // NOT from the general session storage that might be set by a previous admin session
      if (locationState?.isAdmin === true || isAdminParam) {
        setIsAdmin(true);
        console.log("Participant path: Setting admin=true based on explicit flags");
      } else {
        // For participant paths, explicitly clear admin status unless they have direct admin flags
        setIsAdmin(false);
        console.log("Participant path: Ensuring admin=false for regular participants");
      }
      isInitialized.current = true;
      return;
    }
    
    // More robust admin detection with clear precedence:
    // 1. Check if we're on the /admin path (already handled above)
    // 2. Check sessionStorage for persistence 
    // 3. Explicit isAdmin flag in state or query param 
    // 4. If isGuest is false, user is admin (session creator)
    // 5. Having newConversationId implies user created the session 
    let adminStatus = false;
    
    if (storedAdminStatus === 'true') {
      adminStatus = true;
      console.log("Admin status set to true based on sessionStorage");
    } else if (locationState?.isAdmin === true || isAdminParam) {
      adminStatus = true;
      console.log("Admin status set to true based on state or query param");
    } else if (locationState?.isGuest === false) {
      adminStatus = true;
      console.log("Admin status set to true based on not being a guest");
    } else if (locationState?.newConversationId) {
      adminStatus = true;
      console.log("Admin status set to true based on having newConversationId");
    } else if (isAdminPath) {
      // If we're on admin path but no other indicator, still set as admin
      adminStatus = true;
      console.log("Admin status set to true based on admin path as fallback");
    } else {
      // Not explicitly marked as admin or guest, default to non-admin
      adminStatus = false;
      console.log("Admin status set to false as no admin indicators found");
    }
    
    console.log(`Setting admin status to ${adminStatus} based on state:`, 
      JSON.stringify({
        path: location.pathname,
        isAdminPath,
        isParticipantPath,
        isAdminInState: locationState?.isAdmin,
        isAdminInQuery: isAdminParam,
        isGuest: locationState?.isGuest,
        hasNewConversationId: Boolean(locationState?.newConversationId),
        storedAdminStatus
      })
    );
    
    // Store in sessionStorage if admin
    if (adminStatus) {
      sessionStorage.setItem(adminStorageKey, 'true');
    }
    
    setIsAdmin(adminStatus);
    isInitialized.current = true;
  }, [location, isAdmin]);

  // Function to manually set admin status
  const setAdminStatus = (status: boolean) => {
    setIsAdmin(status);
    if (status) {
      sessionStorage.setItem('isAdminSession', 'true');
    } else {
      sessionStorage.removeItem('isAdminSession');
    }
  };

  return { isAdmin, setAdminStatus };
}
