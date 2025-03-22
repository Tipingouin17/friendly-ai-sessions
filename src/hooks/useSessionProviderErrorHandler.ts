
import { useCallback, useEffect } from "react";

interface UseSessionProviderErrorHandlerProps {
  dataError: string | null;
  effectiveAdmin: boolean;
  handleError: (error: string) => void;
}

/**
 * Hook to handle session provider errors with special handling for admin users
 */
export function useSessionProviderErrorHandler({
  dataError,
  effectiveAdmin,
  handleError
}: UseSessionProviderErrorHandlerProps) {
  // Handle data errors
  useEffect(() => {
    if (dataError) {
      // Skip reporting session full errors for admin users
      const isSessionFullError = dataError.includes("full") || dataError.includes("maximum capacity");
      
      if (isSessionFullError && effectiveAdmin) {
        console.log("🔑 Suppressing session full error for admin in SessionProviderCore");
      } else {
        console.error("Session data error:", dataError);
        handleError(dataError);
      }
    }
  }, [dataError, handleError, effectiveAdmin]);
}
