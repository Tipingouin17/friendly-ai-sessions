/**
 * use Session Wrapper Initialization
 *
 * Hook for the AIfacilitator application.
 */

import { useRef, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

interface UseSessionWrapperInitializationProps {
  onInitialized: () => void;
  onLoading: (isLoading: boolean) => void;
  sessionMountedRef: React.RefObject<boolean>;
  effectiveAdmin: boolean;
  isOnAdminPath: boolean;
}

export function useSessionWrapperInitialization({
  onInitialized,
  onLoading,
  sessionMountedRef,
  effectiveAdmin,
  isOnAdminPath
}: UseSessionWrapperInitializationProps) {
  const providerInitialized = useRef(false);
  const { toast } = useToast();
  const showedAdminToast = useRef(false);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timeout
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
    }

    // Use shorter timeout for admin sessions
    const adminTimeout = (effectiveAdmin || isOnAdminPath) ? 1500 : 3000;
    
    // Set admin status immediately for admin paths
    if (isOnAdminPath) {
      sessionStorage.setItem('isAdminSession', 'true');
    }
    
    initTimeoutRef.current = setTimeout(() => {
      if (!providerInitialized.current && sessionMountedRef.current) {
        providerInitialized.current = true;
        onInitialized();
        
        // Force loading to false immediately for admin sessions
        if (effectiveAdmin || isOnAdminPath) {
          onLoading(false);
        }
      }
    }, adminTimeout);
    
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [onInitialized, onLoading, effectiveAdmin, isOnAdminPath, sessionMountedRef]);

  return { providerInitialized };
}
