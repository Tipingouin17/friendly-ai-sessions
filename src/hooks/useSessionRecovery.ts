
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
  
  // Enhanced admin detection - check multiple sources
  const isAdminSession = location.pathname.includes('/admin') || 
                         sessionStorage.getItem('isAdminSession') === 'true' ||
                         location.search.includes('admin=true');

  // Set up component lifecycle
  useEffect(() => {
    console.log("Session recovery hook mounted, isAdmin:", isAdminSession);
    sessionMountedRef.current = true;
    
    // If admin, store the status to ensure persistence
    if (isAdminSession) {
      sessionStorage.setItem('isAdminSession', 'true');
    }
    
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
    // IMPORTANT: Skip all recovery for admin sessions completely
    if (!sessionMountedRef.current || isRecovering || isAdminSession) {
      if (isAdminSession) {
        console.log("Admin session: Skipping recovery entirely");
        return;
      }
    }
    
    // Only proceed with recovery for non-admin sessions
    setIsRecovering(true);
    console.log(`Retrying connection (attempt ${connectionAttempts + 1})...`);
    setConnectionAttempts(prev => prev + 1);
    setLastAttemptTime(Date.now());
    
    const retryDelay = Math.min(1000 * (connectionAttempts + 1), 3000);
    
    recoveryTimeoutRef.current = setTimeout(() => {
      try {
        if (!sessionMountedRef.current) return;
        
        // Skip recovery for admin sessions even if they somehow get here
        if (isAdminSession) {
          console.log("Admin session detected during recovery, aborting");
          setIsRecovering(false);
          return;
        }
        
        // IMPORTANT: Use React Router navigate instead of window.location
        if (connectionAttempts < 3) {
          const searchParams = new URLSearchParams(location.search);
          const sessionId = searchParams.get('id') || currentConversationId?.toString();
          
          if (sessionId) {
            // Use navigate instead of window.location.replace
            navigate(`/session?id=${sessionId}`, { replace: true });
            
            toast({
              title: "Reconnecting",
              description: "Attempting to reconnect to the session...",
            });
          }
        } else {
          toast({
            title: "Connection Status",
            description: "Reconnecting...",
          });
        }
      } catch (err) {
        console.error("Error during connection retry:", err);
      } finally {
        setIsRecovering(false);
      }
    }, retryDelay);
    
  }, [connectionAttempts, isCrossOrigin, location.search, toast, currentConversationId, isRecovering, isAdminSession, navigate]);

  return { 
    connectionAttempts, 
    lastAttemptTime, 
    retryConnection,
    sessionMountedRef,
    recoveryTimerRef,
    isRecovering,
    isAdminSession // Export this for other hooks to use
  };
}
