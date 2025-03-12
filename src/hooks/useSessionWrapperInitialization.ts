
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

  useEffect(() => {
    const adminTimeout = isOnAdminPath ? 4000 : 8000;
    
    const initTimeout = setTimeout(() => {
      if (!providerInitialized.current) {
        console.log(`Force initializing provider after ${adminTimeout}ms timeout`);
        providerInitialized.current = true;
        onInitialized();
        onLoading(false);
        
        if (effectiveAdmin || isOnAdminPath) {
          sessionStorage.setItem('isAdminSession', 'true');
        }
      }
    }, adminTimeout);
    
    return () => clearTimeout(initTimeout);
  }, [onInitialized, onLoading, effectiveAdmin, isOnAdminPath]);

  useEffect(() => {
    if ((effectiveAdmin || isOnAdminPath) && !showedAdminToast.current) {
      showedAdminToast.current = true;
      toast({
        title: "Admin Mode Active",
        description: "You are viewing this session as an administrator."
      });
      
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [effectiveAdmin, isOnAdminPath, toast]);

  return { providerInitialized };
}
