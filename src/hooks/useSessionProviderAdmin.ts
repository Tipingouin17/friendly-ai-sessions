
import { useEffect } from 'react';

interface UseSessionProviderAdminProps {
  forceAdmin: boolean;
}

export const useSessionProviderAdmin = ({ forceAdmin }: UseSessionProviderAdminProps) => {
  useEffect(() => {
    if (forceAdmin) {
      console.log("Enforcing admin status due to forceAdmin=true");
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [forceAdmin]);
};
