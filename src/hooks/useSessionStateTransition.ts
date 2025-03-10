
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
  // All hooks need to be called at the top level in the same order every render
  const { toast } = useToast();
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Calculate variables that don't need useState
  const maxParticipants = props.conversation?.participants || 0;
  const currentParticipants = props.conversation?.current_participants || 0;
  const isSessionFull = maxParticipants > 0 && currentParticipants >= maxParticipants;
  
  // For admin, we want to show the admin controls even before session is started
  // For participants, we should show waiting screen until admin starts
  const shouldShowSession = isAdmin ? true : (props.isSessionStartedInDB || sessionStarted || isSessionFull || isTransitioning);
  
  // Handle state transitions with a delay to avoid flashing
  useEffect(() => {
    if (props.isSessionStartedInDB && !sessionStarted) {
      setIsTransitioning(true);
      
      // Shorter transition for admins
      const transitionTime = isAdmin ? 200 : 500;
      
      const timer = setTimeout(() => {
        setSessionStarted(true);
        setIsTransitioning(false);
        
        if (isAdmin) {
          console.log("Admin: Session started state updated");
        } else {
          toast({
            title: "Session Started",
            description: "The host has started the session.",
          });
        }
      }, transitionTime);
      
      return () => clearTimeout(timer);
    }
  }, [props.isSessionStartedInDB, sessionStarted, setSessionStarted, isAdmin, toast]);
  
  // Handler for starting the session - using useCallback to prevent recreation
  const handleStartSession = useCallback(() => {
    console.log("Start session button clicked");
    setIsTransitioning(true);
    
    try {
      props.handleStartSession();
      toast({
        title: "Starting session",
        description: isAdmin ? "The session is starting for all participants..." : "Waiting for the session to start...",
      });
      
      // Set a timer to transition state - shorter for admin
      const transitionTime = isAdmin ? 500 : 1000;
      setTimeout(() => {
        setSessionStarted(true);
        setIsTransitioning(false);
      }, transitionTime);
    } catch (error) {
      console.error("Error starting session:", error);
      setIsTransitioning(false);
      toast({
        title: "Error Starting Session",
        description: "There was a problem starting the session. Please try again.",
        variant: "destructive"
      });
    }
  }, [props.handleStartSession, toast, setSessionStarted, isAdmin]);

  return {
    isTransitioning,
    shouldShowSession,
    currentParticipants,
    maxParticipants,
    isSessionFull,
    handleStartSession
  };
}
