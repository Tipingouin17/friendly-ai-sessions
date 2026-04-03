/**
 * use Session Error Handling
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";

export function useSessionErrorHandling() {
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Handle error state
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    console.error("Session error:", errorMessage);
    
    toast({
      title: "Session Error",
      description: errorMessage,
      variant: "destructive",
    });
  }, [toast]);

  return { error, setError, handleError };
}
