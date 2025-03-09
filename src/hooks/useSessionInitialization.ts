
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { SessionContextProps } from "@/types/session";

interface UseSessionInitializationProps {
  props: SessionContextProps;
  setSessionStarted: (started: boolean) => void;
}

export function useSessionInitialization({ 
  props, 
  setSessionStarted 
}: UseSessionInitializationProps) {
  const { toast } = useToast();
  const [initializing, setInitializing] = useState(true);
  const initializationTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Set up cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (initializationTimerRef.current) {
        window.clearTimeout(initializationTimerRef.current);
      }
    };
  }, []);

  // Update sessionStarted state based on DB status
  useEffect(() => {
    if (props.isSessionStartedInDB) {
      console.log("Session started status from DB:", props.isSessionStartedInDB);
      setSessionStarted(true);
    }
  }, [props.isSessionStartedInDB, setSessionStarted]);

  // Initialization delay to ensure consistent behavior during initial load
  useEffect(() => {
    if (!mountedRef.current) return;
    
    if (initializing && props.conversation && props.currentConversationId) {
      initializationTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) {
          console.log("Session state initialization complete");
          setInitializing(false);
        }
      }, 1000);
    }
    
    return () => {
      if (initializationTimerRef.current) {
        window.clearTimeout(initializationTimerRef.current);
      }
    };
  }, [initializing, props.conversation, props.currentConversationId]);

  // Connection recovery through refetching
  useEffect(() => {
    if (!mountedRef.current) return;
    
    const recoverInterval = setInterval(() => {
      if (props.conversation && props.currentConversationId && !props.isConnected) {
        console.log("Session state attempting recovery refetch");
        props.refetch();
      }
    }, 10000);
    
    return () => {
      clearInterval(recoverInterval);
    };
  }, [props.conversation, props.currentConversationId, props.isConnected, props.refetch]);

  // Handle connection status changes
  useEffect(() => {
    if (!mountedRef.current) return;
    
    if (props.isConnected && props.connectionAttempts > 0) {
      console.log("Connection restored after", props.connectionAttempts, "attempts");
      toast({
        title: "Connection Restored",
        description: "Successfully reconnected to the session.",
      });
    }
  }, [props.isConnected, props.connectionAttempts, toast]);

  return {
    initializing,
    mountedRef
  };
}
