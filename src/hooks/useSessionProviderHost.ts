
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface UseSessionProviderHostProps {
  forceHost?: boolean;
}

export function useSessionProviderHost({ forceHost = false }: UseSessionProviderHostProps) {
  const location = useLocation();
  const isOnHostPath = location.pathname.includes('/host');
  
  // Host status should be determined server-side only
  // No more automatic session storage manipulation
  
  return {
    isHost: forceHost || isOnHostPath
  };
}
