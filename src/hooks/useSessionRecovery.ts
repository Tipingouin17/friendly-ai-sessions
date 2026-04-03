/**
 * use Session Recovery
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export function useSessionRecovery(isCrossOrigin: boolean, currentConversationId?: number | null) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState<number>(Date.now());
  const [isRecovering, setIsRecovering] = useState(false);
  const sessionMountedRef = useRef(false);
  const recoveryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Enhanced admin detection - check URL path first as it's most reliable
  const isOnAdminPath = location.pathname.includes('/admin');
  
  // For non-admin paths, check other sources but don't rely on session storage
  // This prevents cross-contamination between admin/participant sessions
  const isAdminSession = isOnAdminPath || 
                         (location.search.includes('admin=true'));

  // Skip all recovery for admin sessions
  const shouldSkipRecovery = isAdminSession || isOnAdminPath;
  
  // Set up component lifecycle
  useEffect(() => {
    sessionMountedRef.current = true;
    
    // Only store status for actual admin paths to prevent conflicts
    if (isOnAdminPath) {
      sessionStorage.setItem('isAdminSession', 'true');
    }
    
    return () => {
      sessionMountedRef.current = false;
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
        recoveryTimeoutRef.current = null;
      }
    };
  }, [isAdminSession, isOnAdminPath, currentConversationId]);
  
  // Reset connection state when conversation ID changes
  useEffect(() => {
    if (currentConversationId) {
      // Reset state for new conversation
      if (lastAttemptTime === 0) {
        setLastAttemptTime(Date.now());
      }
      // Reset connection attempts for new session
      setConnectionAttempts(0);
    }
  }, [currentConversationId, lastAttemptTime]);
  
  // Enhanced retry function with better backoff and admin handling
  const retryConnection = useCallback(() => {
    if (!sessionMountedRef.current) return;

    // Skip recovery for admin sessions
    if (shouldSkipRecovery) {
      return;
    }

    if (connectionAttempts < 5 && currentConversationId) {
      const newAttemptCount = connectionAttempts + 1;
      
      setConnectionAttempts(newAttemptCount);
      setLastAttemptTime(Date.now());
      setIsRecovering(true);
      
      // Clear any existing timers
      if (recoveryTimerRef.current !== null) {
        clearTimeout(recoveryTimerRef.current);
        recoveryTimerRef.current = null;
      }
      
      // Use progressive backoff with longer delays
      const backoffTime = Math.min(3000 * Math.pow(1.5, newAttemptCount - 1), 15000);
      
      recoveryTimerRef.current = setTimeout(() => {
        if (sessionMountedRef.current) {
          setIsRecovering(false);
          
          // Force a page refresh for connection recovery on later attempts
          if (newAttemptCount > 2) {
            window.location.reload();
          }
        }
      }, backoffTime);
    } else if (connectionAttempts >= 5) {
      setIsRecovering(false);
      
      if (sessionMountedRef.current && !shouldSkipRecovery) {
        toast({
          title: "Connection Issues",
          description: "Unable to establish a stable connection. Please check your internet and try refreshing the page.",
          variant: "destructive"
        });
      }
    }
  }, [connectionAttempts, currentConversationId, shouldSkipRecovery, toast]);

  // Handle successful connection
  const handleConnectionEstablished = useCallback(() => {
    if (!sessionMountedRef.current) return;
    
    setConnectionAttempts(0);
    setLastAttemptTime(Date.now());
    setIsRecovering(false);
    
    // Clear any pending recovery timers
    if (recoveryTimerRef.current !== null) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
  }, []);

  return {
    connectionAttempts,
    setConnectionAttempts,
    lastAttemptTime,
    retryConnection,
    sessionMountedRef,
    recoveryTimerRef,
    isRecovering,
    handleConnectionEstablished
  };
}
