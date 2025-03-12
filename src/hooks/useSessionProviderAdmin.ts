
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface UseSessionProviderAdminProps {
  forceAdmin?: boolean;
}

export function useSessionProviderAdmin({ forceAdmin = false }: UseSessionProviderAdminProps) {
  const location = useLocation();
  const isOnAdminPath = location.pathname.includes('/admin');
  
  useEffect(() => {
    if (forceAdmin || isOnAdminPath) {
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [forceAdmin, isOnAdminPath]);

  return {
    isAdmin: forceAdmin || isOnAdminPath || sessionStorage.getItem('isAdminSession') === 'true'
  };
}
