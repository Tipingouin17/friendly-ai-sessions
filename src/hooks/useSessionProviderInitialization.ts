/**
 * use Session Provider Initialization
 *
 * Hook for the AIfacilitator application.
 */

import { useRef, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";

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
    initializationAttempted.current = true;
    
    // Use shorter timeouts for both admin and participant sessions to prevent stuck states
    const initialTimeout = (isAdmin || forceAdmin) ? 2000 : 3000;
    
    initializeTimeoutRef.current = setTimeout(() => {
      if (!sessionMountedRef.current || forcedInitialization.current) return;
      
      forcedInitialization.current = true;
      onInitialized();
      
      // Only show toast for non-admin participants with significant delays
      if (!(isAdmin || forceAdmin) && Date.now() - performance.now() > 4000) {
        toast({
          title: "Session initialization taking longer than expected",
          description: "We're still trying to connect to the session."
        });
      }
    }, initialTimeout);
    
    // Shorter critical timeout for participants
    const criticalTimeout = (isAdmin || forceAdmin) ? 4000 : 6000;
    
    const criticalTimeoutId = setTimeout(() => {
      if (!sessionMountedRef.current || forcedInitialization.current) return;
      
      forcedInitialization.current = true;
      onInitialized();
      onLoading(false); // Force loading state to false
      
      // Only show toast for non-admin participants with significant delays
      if (!(isAdmin || forceAdmin) && Date.now() - performance.now() > 5000) {
        toast({
          title: "Session initialization taking longer than expected",
          description: "Please wait a moment while we complete setup.",
          variant: "destructive"
        });
      }
    }, criticalTimeout);
    
    return () => {
      if (initializeTimeoutRef.current) {
        clearTimeout(initializeTimeoutRef.current);
        initializeTimeoutRef.current = null;
      }
      clearTimeout(criticalTimeoutId);
    };
  }, [onInitialized, sessionMountedRef, toast, onLoading, isAdmin, forceAdmin]);

  return {
    initializeTimeoutRef,
    forcedInitialization
  };
};
