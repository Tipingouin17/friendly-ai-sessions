/**
 * use Loading State Timer
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect, useRef } from 'react';

interface UseLoadingStateTimerProps {
  loadingTimeElapsed?: number;
  retryCount?: number;
  error?: string | null;
  onRetry?: () => void;
}

export function useLoadingStateTimer({ 
  loadingTimeElapsed = 0, 
  retryCount = 0, 
  error, 
  onRetry 
}: UseLoadingStateTimerProps) {
  const [isLongWait, setIsLongWait] = useState(false);
  const [isVeryLongWait, setIsVeryLongWait] = useState(false);
  const [elapsed, setElapsed] = useState(loadingTimeElapsed);
  const startTime = useRef(Date.now());
  const mountedRef = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoRetryAttempted = useRef(false);
  
  useEffect(() => {
    mountedRef.current = true;
    
    // CRITICAL FIX: Automatically retry connection sooner for better participant experience
    timerRef.current = setInterval(() => {
      if (mountedRef.current) {
        const newElapsed = (Date.now() - startTime.current) / 1000;
        setElapsed(newElapsed);
        
        if (newElapsed > 2 && !isLongWait) {
          setIsLongWait(true);
        }
        if (newElapsed > 5 && !isVeryLongWait) {
          setIsVeryLongWait(true);
        }
        
        // Auto-retry logic - more aggressive for better user experience
        if (onRetry && !autoRetryAttempted.current) {
          if ((newElapsed > 3 && retryCount === 0) || 
              (error && newElapsed > 2)) {
            onRetry();
            autoRetryAttempted.current = true;
          }
        }
      }
    }, 1000);
    
    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [onRetry, retryCount, error, isLongWait, isVeryLongWait]);

  // Handle initial state based on props
  useEffect(() => {
    if (loadingTimeElapsed > 2) {
      setIsLongWait(true);
    }
    if (loadingTimeElapsed > 5 || retryCount > 0 || error) {
      setIsLongWait(true);
      setIsVeryLongWait(true);
    }
  }, [loadingTimeElapsed, retryCount, error]);

  return {
    elapsed,
    isLongWait,
    isVeryLongWait,
    mountedRef
  };
}
