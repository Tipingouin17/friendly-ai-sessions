
import { useState, useCallback } from "react";

interface UseSessionErrorHandlerProps {
  onError?: (error: string) => void;
}

export const useSessionErrorHandler = ({ onError }: UseSessionErrorHandlerProps = { /* no-op */ }) => {
  const [providerError, setProviderError] = useState<string | null>(null);
  
  const handleError = useCallback((errorMessage: string) => {
    console.error("Session provider error:", errorMessage);
    setProviderError(errorMessage);
    if (onError && typeof onError === 'function') {
      onError(errorMessage);
    }
  }, [onError]);
  
  return {
    providerError,
    handleError
  };
};
