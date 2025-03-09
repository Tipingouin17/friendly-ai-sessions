
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export const useSessionPageState = () => {
  const { toast } = useToast();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine if user is admin based on location state
  useEffect(() => {
    const locationState = location.state as { 
      isGuest?: boolean; 
      showMessaging?: boolean;
      isAdmin?: boolean;
    } | null;
    
    // User is considered admin if:
    // 1. They're explicitly marked as admin in the state
    // 2. They're not a guest (implying they created the session)
    // 3. They're not accessing via the join flow
    const adminStatus = Boolean(locationState?.isAdmin) || 
      (locationState?.isGuest !== true);
    
    setIsAdmin(adminStatus);
    console.log("Session page - isAdmin determined as:", adminStatus, "from state:", locationState);
  }, [location]);

  // Log initial state for debugging
  useEffect(() => {
    console.log("Session page loaded with state:", location.state);
  }, [location.state]);

  // Reset error state if we navigate away and back
  useEffect(() => {
    return () => {
      setError(null);
    };
  }, []);

  const handleSessionFull = () => {
    // Auto-start session when it's full
    setSessionStarted(true);
    
    toast({
      title: "Session is full",
      description: "The maximum number of participants has joined. Starting session automatically.",
    });
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    console.error("Session error:", errorMessage);
    
    toast({
      title: "Session Error",
      description: errorMessage,
      variant: "destructive",
    });
  };

  return {
    isAdmin,
    sessionStarted,
    setSessionStarted,
    isLoading,
    setIsLoading,
    error,
    handleSessionFull,
    handleError
  };
};
