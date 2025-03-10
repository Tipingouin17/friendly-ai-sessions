
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

  // Set up component lifecycle
  useEffect(() => {
    console.log("Session recovery hook mounted");
    sessionMountedRef.current = true;
    
    return () => {
      console.log("Session recovery hook unmounted");
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
  }, []);

  // Retry connection function with improved error handling and shorter timeouts
  const retryConnection = useCallback(() => {
    if (!sessionMountedRef.current) return;
    
    // Prevent multiple retries in quick succession
    if (isRecovering) {
      console.log("Already recovering, skipping additional retry");
      return;
    }
    
    setIsRecovering(true);
    console.log(`Retrying connection (attempt ${connectionAttempts + 1})...`);
    setConnectionAttempts(prev => prev + 1);
    setLastAttemptTime(Date.now());
    
    // Use more aggressive backoff strategy to recover faster
    const retryDelay = Math.min(500 * connectionAttempts, 2000);
    
    recoveryTimeoutRef.current = setTimeout(() => {
      try {
        if (!sessionMountedRef.current) return;
        
        if (connectionAttempts < 3) {
          if (isCrossOrigin) {
            const searchParams = new URLSearchParams(location.search);
            const sessionId = searchParams.get('id') || currentConversationId?.toString();
            
            if (sessionId) {
              toast({
                title: "Reestablishing connection",
                description: "Trying an alternative connection method...",
              });
              
              // Use location.replace to avoid adding to history stack
              window.location.replace(`${window.location.origin}/session?id=${sessionId}`);
            } else {
              window.location.reload();
            }
          } else {
            window.location.reload();
          }
        } else {
          toast({
            title: "Connection issues detected",
            description: "Unable to establish a stable connection. Trying an alternative method...",
            variant: "destructive",
          });
          
          // Force a clean reload after multiple attempts
          setTimeout(() => {
            window.location.href = window.location.href;
          }, 500);
        }
      } catch (err) {
        console.error("Error during connection retry:", err);
      } finally {
        setIsRecovering(false);
      }
    }, retryDelay);
    
  }, [connectionAttempts, isCrossOrigin, location.search, toast, currentConversationId, isRecovering]);

  return { 
    connectionAttempts, 
    lastAttemptTime, 
    retryConnection,
    sessionMountedRef,
    recoveryTimerRef,
    isRecovering
  };
}
