
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { isInCrossOriginContext } from "@/utils/crossOriginUtils";

interface UseSessionErrorHandlingProps {
  error: Error | null;
  conversationId: number | null;
  onError?: (error: string) => void;
}

export function useSessionErrorHandling({
  error,
  conversationId,
  onError
}: UseSessionErrorHandlingProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCrossOrigin, setIsCrossOrigin] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check for cross-origin context
  useEffect(() => {
    setIsCrossOrigin(isInCrossOriginContext());
  }, []);

  // Process errors and display toast notifications
  useEffect(() => {
    if (error) {
      console.error('Session error:', error);
      const message = error.message || "An unexpected error occurred";
      setErrorMessage(message);
      
      // If we're in a cross-origin context, handle errors differently
      const errorToast = {
        title: "Error",
        description: isCrossOrigin 
          ? "There was a problem connecting to the session. This may be due to cross-origin restrictions."
          : message,
        variant: "destructive" as const,
      };
      
      // Notify parent component if callback provided
      if (onError && typeof onError === 'function') {
        onError(message);
      }
      
      // Show toast notification for user feedback
      toast(errorToast);
      
      // For critical errors, redirect to home (but only if not in cross-origin context)
      if (!isCrossOrigin && 
          (message.includes("session has ended") || 
           message.includes("no longer available") ||
           !conversationId)) {
        navigate('/');
      }
    }
  }, [error, conversationId, navigate, toast, onError, isCrossOrigin]);

  // Clear error state
  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return {
    errorMessage,
    setErrorMessage,
    clearError,
    isCrossOrigin
  };
}
