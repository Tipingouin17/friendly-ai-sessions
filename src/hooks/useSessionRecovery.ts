
import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export function useSessionRecovery(isCrossOrigin: boolean, currentConversationId?: number | null) {
  const location = useLocation();
  const { toast } = useToast();
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState<number>(0);
  const sessionMountedRef = useRef(false);
  const recoveryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Set up component lifecycle
  useEffect(() => {
    sessionMountedRef.current = true;
    return () => {
      sessionMountedRef.current = false;
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
      }
    };
  }, []);

  // Retry connection function
  const retryConnection = useCallback(() => {
    if (!sessionMountedRef.current) return;
    
    console.log("Retrying connection...");
    setConnectionAttempts(prev => prev + 1);
    setLastAttemptTime(Date.now());
    
    if (connectionAttempts < 3) {
      if (isCrossOrigin) {
        const searchParams = new URLSearchParams(location.search);
        const sessionId = searchParams.get('id') || currentConversationId?.toString();
        
        if (sessionId) {
          toast({
            title: "Reestablishing connection",
            description: "Trying an alternative connection method for cross-origin context...",
          });
          
          window.location.href = `${window.location.origin}/session?id=${sessionId}`;
        } else {
          window.location.reload();
        }
      } else {
        window.location.reload();
      }
    } else {
      toast({
        title: "Connection issues detected",
        description: "Trying an alternative connection method...",
        variant: "destructive",
      });
      
      setTimeout(() => {
        window.location.href = window.location.href;
      }, 1000);
    }
  }, [connectionAttempts, isCrossOrigin, location.search, toast, currentConversationId]);

  return { 
    connectionAttempts, 
    lastAttemptTime, 
    retryConnection,
    sessionMountedRef,
    recoveryTimerRef
  };
}
