/**
 * use Session Error Boundary
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useCallback, useEffect } from "react";

interface UseSessionErrorBoundaryProps {
  onError?: (error: string) => void;
  initialError?: string | null;
}

export const useSessionErrorBoundary = ({ 
  onError, 
  initialError = null 
}: UseSessionErrorBoundaryProps = { /* no-op */ }) => {
  const [boundaryError, setBoundaryError] = useState<string | null>(initialError);
  
  // Reset error when initialError changes to null
  useEffect(() => {
    if (initialError === null && boundaryError !== null) {
      setBoundaryError(null);
    } else if (initialError !== null && initialError !== boundaryError) {
      setBoundaryError(initialError);
    }
  }, [initialError, boundaryError]);
  
  const handleError = useCallback((errorMessage: string) => {
    console.error("Session error boundary triggered:", errorMessage);
    setBoundaryError(errorMessage);
    
    if (onError && typeof onError === 'function') {
      onError(errorMessage);
    }
  }, [onError]);
  
  const clearError = useCallback(() => {
    setBoundaryError(null);
  }, []);
  
  return {
    boundaryError,
    handleError,
    clearError
  };
};
