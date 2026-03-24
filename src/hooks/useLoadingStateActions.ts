
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseLoadingStateActionsProps {
  elapsed: number;
  onRetry?: () => void;
  mountedRef: React.RefObject<boolean>;
}

export function useLoadingStateActions({ elapsed, onRetry, mountedRef }: UseLoadingStateActionsProps) {
  const navigate = useNavigate();

  // Prevent extremely long waits - using React Router navigation instead of page refresh
  useEffect(() => {
    const autoRefreshTimeout = setTimeout(() => {
      if (elapsed > 15 && mountedRef.current) {
        // Use navigateHandler instead of window.location.reload()
        if (onRetry) {
          onRetry();
        }
      }
    }, 15000);
    
    return () => clearTimeout(autoRefreshTimeout);
  }, [elapsed, onRetry, mountedRef]);

  const handleRefresh = () => {
    if (onRetry) {
      onRetry();
    } else {
      // Use React Router instead of direct page reload
      const searchParams = new URLSearchParams(window.location.search);
      const sessionId = searchParams.get('id');
      
      if (sessionId) {
        // Add a retry parameter to the URL to ensure state reset
        navigate(`/session?id=${sessionId}&retry=${Date.now()}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  };

  const goToHome = () => {
    navigate('/');
  };

  return {
    handleRefresh,
    goToHome
  };
}
