
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

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
  const { toast } = useToast();
  const navigate = useNavigate();

  // Process errors and display toast notifications
  useEffect(() => {
    if (error) {
      console.error('Session error:', error);
      const message = error.message || "An unexpected error occurred";
      setErrorMessage(message);
      
      // Notify parent component if callback provided
      if (onError && typeof onError === 'function') {
        onError(message);
      }
      
      // Show toast notification for user feedback
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      
      // For critical errors, redirect to home
      if (message.includes("session has ended") || 
          message.includes("no longer available") ||
          !conversationId) {
        navigate('/');
      }
    }
  }, [error, conversationId, navigate, toast, onError]);

  // Clear error state
  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return {
    errorMessage,
    setErrorMessage,
    clearError
  };
}
