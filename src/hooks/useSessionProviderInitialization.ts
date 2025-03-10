
import { useRef, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { SessionContextProps } from "@/types/session";

interface UseSessionProviderInitializationProps {
  onInitialized: () => void;
  onLoading: (isLoading: boolean) => void;
  sessionMountedRef: React.RefObject<boolean>;
  isAdmin: boolean;
  forceAdmin: boolean;
}

export const useSessionProviderInitialization = ({
  onInitialized,
  onLoading,
  sessionMountedRef,
  isAdmin,
  forceAdmin
}: UseSessionProviderInitializationProps) => {
  const initializeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializationAttempted = useRef(false);
  const forcedInitialization = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initializationAttempted.current) return;
    
    console.log("Setting up initialization safety timeout, isAdmin:", isAdmin || forceAdmin);
    
    // Use shorter timeouts for both admin and participant sessions to prevent stuck states
    const initialTimeout = (isAdmin || forceAdmin) ? 2000 : 3000;
    
    initializeTimeoutRef.current = setTimeout(() => {
      if (sessionMountedRef.current && !forcedInitialization.current) {
        console.log("Forcing provider initialization after timeout, isAdmin:", isAdmin || forceAdmin);
        forcedInitialization.current = true;
        onInitialized();
        toast({
          title: "Session initialization taking longer than expected",
          description: "We're still trying to connect to the session."
        });
      }
    }, initialTimeout);
    
    // Shorter critical timeout for participants
    const criticalTimeout = (isAdmin || forceAdmin) ? 4000 : 6000;
    
    setTimeout(() => {
      if (sessionMountedRef.current && !forcedInitialization.current) {
        console.log("Critical initialization timeout reached, forcing initialization, isAdmin:", isAdmin || forceAdmin);
        forcedInitialization.current = true;
        onInitialized();
        onLoading(false); // Force loading state to false
        toast({
          title: "Session initialization taking longer than expected",
          description: "Please wait a moment while we complete setup.",
          variant: (isAdmin || forceAdmin) ? "default" : "destructive"
        });
      }
    }, criticalTimeout);
    
    initializationAttempted.current = true;
    
    return () => {
      if (initializeTimeoutRef.current) {
        clearTimeout(initializeTimeoutRef.current);
      }
    };
  }, [onInitialized, sessionMountedRef, toast, onLoading, isAdmin, forceAdmin]);

  return {
    initializeTimeoutRef,
    forcedInitialization
  };
};
