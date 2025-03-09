
import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";

export function useSessionState() {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [hasInitializedProvider, setHasInitializedProvider] = useState(false);
  const { toast } = useToast();

  // Handle session full state
  const handleSessionFull = useCallback(() => {
    // Auto-start session when it's full
    setSessionStarted(true);
    
    toast({
      title: "Session is full",
      description: "The maximum number of participants has joined. Starting session automatically.",
    });
  }, [toast]);

  return { 
    sessionStarted, 
    setSessionStarted, 
    hasInitializedProvider, 
    setHasInitializedProvider,
    handleSessionFull 
  };
}
