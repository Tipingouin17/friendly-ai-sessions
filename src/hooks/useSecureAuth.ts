
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { validateEnvironmentSecurity } from '@/utils/securityHelpers';

interface SecurityContext {
  isSecureContext: boolean;
  sessionTimeout: number;
  lastActivity: number;
}

export const useSecureAuth = () => {
  const auth = useAuth();
  const [securityContext, setSecurityContext] = useState<SecurityContext>({
    isSecureContext: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    lastActivity: Date.now()
  });
  
  // Validate environment on mount
  useEffect(() => {
    validateEnvironmentSecurity();
  }, []);
  
  // Track user activity for session timeout
  useEffect(() => {
    const updateActivity = () => {
      setSecurityContext(prev => ({
        ...prev,
        lastActivity: Date.now()
      }));
    };
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, []);
  
  // Check for session timeout
  useEffect(() => {
    if (!auth.user) return;
    
    const checkTimeout = () => {
      const timeInactive = Date.now() - securityContext.lastActivity;
      
      if (timeInactive > securityContext.sessionTimeout) {
        auth.logout();
      }
    };
    
    const interval = setInterval(checkTimeout, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [auth, securityContext.lastActivity, securityContext.sessionTimeout]);
  
  // Enhanced logout with cleanup
  const secureLogout = async () => {
    try {
      // Clear any sensitive data from localStorage
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.includes('session') || key.includes('participant') || key.includes('auth')
      );
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Perform logout
      await auth.logout();
    } catch (error) {
      console.error('Error during secure logout:', error);
    }
  };
  
  return {
    ...auth,
    securityContext,
    secureLogout,
    isSecureConnection: securityContext.isSecureContext
  };
};
