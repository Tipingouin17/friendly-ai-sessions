
import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export function useSessionRecovery(isCrossOrigin: boolean, currentConversationId?: number | null) {
  const location = useLocation();
  const { toast } = useToast();
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState<number>(Date.now());
  const [isRecovering, setIsRecovering] = useState(false);
  const sessionMountedRef = useRef(false);
  const recoveryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAdminSession = location.pathname.includes('/admin') || sessionStorage.getItem('isAdminSession') === 'true';

  // Set up component lifecycle
  useEffect(() => {
    console.log("Session recovery hook mounted, isAdmin:", isAdminSession);
    sessionMountedRef.current = true;
    
    return () => {
      sessionMountedRef.current = false;
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
      }
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, [isAdminSession]);

  const retryConnection = useCallback(() => {
    if (!sessionMountedRef.current || isRecovering) return;
    
    // For admin sessions, don't auto-reload
    if (isAdminSession && connectionAttempts > 0) {
      console.log("Admin session: Skipping auto-reload recovery");
      toast({
        title: "Connection Issues",
        description: "Trying to reestablish connection...",
      });
      return;
    }

    setIsRecovering(true);
    console.log(`Retrying connection (attempt ${connectionAttempts + 1})...`);
    setConnectionAttempts(prev => prev + 1);
    setLastAttemptTime(Date.now());
    
    const retryDelay = Math.min(1000 * (connectionAttempts + 1), 3000);
    
    recoveryTimeoutRef.current = setTimeout(() => {
      try {
        if (!sessionMountedRef.current) return;
        
        if (!isAdminSession && connectionAttempts < 3) {
          const searchParams = new URLSearchParams(location.search);
          const sessionId = searchParams.get('id') || currentConversationId?.toString();
          
          if (sessionId) {
            window.location.replace(`${window.location.origin}/session?id=${sessionId}`);
          }
        } else {
          toast({
            title: "Connection Status",
            description: isAdminSession ? "Admin session maintained" : "Reconnecting...",
          });
        }
      } catch (err) {
        console.error("Error during connection retry:", err);
      } finally {
        setIsRecovering(false);
      }
    }, retryDelay);
    
  }, [connectionAttempts, isCrossOrigin, location.search, toast, currentConversationId, isRecovering, isAdminSession]);

  return { 
    connectionAttempts, 
    lastAttemptTime, 
    retryConnection,
    sessionMountedRef,
    recoveryTimerRef,
    isRecovering
  };
}
