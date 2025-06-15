
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface UseSessionProviderAdminProps {
  forceAdmin?: boolean;
}

export function useSessionProviderAdmin({ forceAdmin = false }: UseSessionProviderAdminProps) {
  const location = useLocation();
  const isOnAdminPath = location.pathname.includes('/admin');
  
  // Remove automatic session storage manipulation
  // Admin status should be determined server-side only
  
  return {
    isAdmin: forceAdmin || isOnAdminPath
  };
}
