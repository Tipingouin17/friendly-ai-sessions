
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { SessionContextProps } from "@/types/session";

interface UseSessionStateTransitionProps {
  props: SessionContextProps;
  isAdmin: boolean;
  sessionStarted: boolean;
  setSessionStarted: (started: boolean) => void;
  onSessionFull: () => void;
}

export function useSessionStateTransition({
  props,
  isAdmin,
  sessionStarted,
  setSessionStarted,
  onSessionFull
}: UseSessionStateTransitionProps) {
  // Always initialize all hooks at the top level in the same order
  const { toast } = useToast();
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Calculate variables that don't need useState
  const maxParticipants = props.conversation?.participants || 0;
  const currentParticipants = props.conversation?.current_participants || 0;
  const isSessionFull = maxParticipants > 0 && currentParticipants >= maxParticipants;
  const shouldShowSession = props.isSessionStartedInDB || sessionStarted || isSessionFull || isTransitioning;
  
  // Handle state transitions with a delay to avoid flashing
  useEffect(() => {
    if (props.isSessionStartedInDB && !sessionStarted) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setSessionStarted(true);
        setIsTransitioning(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [props.isSessionStartedInDB, sessionStarted, setSessionStarted]);
  
  // Handler for starting the session - using useCallback to prevent recreation
  const handleStartSession = useCallback(() => {
    console.log("Start session button clicked");
    setIsTransitioning(true);
    
    try {
      props.handleStartSession();
      toast({
        title: "Starting session",
        description: "The session is now starting...",
      });
      
      // Set a timer to transition state
      setTimeout(() => {
        setSessionStarted(true);
        setIsTransitioning(false);
      }, 1000);
    } catch (error) {
      console.error("Error starting session:", error);
      setIsTransitioning(false);
      toast({
        title: "Error Starting Session",
        description: "There was a problem starting the session. Please try again.",
        variant: "destructive"
      });
    }
  }, [props.handleStartSession, toast, setSessionStarted]);

  return {
    isTransitioning,
    shouldShowSession,
    currentParticipants,
    maxParticipants,
    isSessionFull,
    handleStartSession
  };
}
