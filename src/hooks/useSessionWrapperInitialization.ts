
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

    // Use shorter timeout for admin sessions to prevent long loading states
    const adminTimeout = (effectiveAdmin || isOnAdminPath) ? 2000 : 4000;
    
    // Set admin status immediately for session protection
    if (effectiveAdmin || isOnAdminPath) {
      sessionStorage.setItem('isAdminSession', 'true');
    }
    
    initTimeoutRef.current = setTimeout(() => {
      if (!providerInitialized.current) {
        console.log(`Force initializing provider after ${adminTimeout}ms timeout, isAdmin:`, effectiveAdmin || isOnAdminPath);
        providerInitialized.current = true;
        onInitialized();
        onLoading(false); // Force loading to false for admin sessions
        
        if (effectiveAdmin || isOnAdminPath) {
          sessionStorage.setItem('isAdminSession', 'true');
        }
      }
    }, adminTimeout);
    
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [onInitialized, onLoading, effectiveAdmin, isOnAdminPath]);

  useEffect(() => {
    if ((effectiveAdmin || isOnAdminPath) && !showedAdminToast.current) {
      showedAdminToast.current = true;
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [effectiveAdmin, isOnAdminPath, toast]);

  return { providerInitialized };
}
