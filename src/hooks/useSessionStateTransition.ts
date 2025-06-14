
import { useState, useEffect, useRef, useCallback } from "react";
import { SessionContextProps } from "@/types/session";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface UseSessionStateTransitionProps {
  props: SessionContextProps;
  isAdmin: boolean;
  sessionStarted: boolean;
  setSessionStarted: (started: boolean) => void;
  onSessionFull?: () => void;
}

export function useSessionStateTransition({
  props,
  isAdmin,
  sessionStarted,
  setSessionStarted,
  onSessionFull
}: UseSessionStateTransitionProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [shouldShowSession, setShouldShowSession] = useState(false);
  const lastSessionStartedRef = useRef(sessionStarted);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionFullTriggeredRef = useRef(false);
  const participantNavigationLockRef = useRef(false);
  const isOnAdminPath = window.location.pathname.includes('/admin');
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Enhanced participant removal check with better validation
  useEffect(() => {
    if (!props.currentConversationId || !props.currentUserParticipantId || isAdmin) return;
    
    // Don't check participant status during session transitions to prevent false positives
    if (participantNavigationLockRef.current) {
      return;
    }
    
    // Check if this participant is still valid
    const checkParticipantStatus = async () => {
      try {
        if (!props.currentConversationId || !props.currentUserParticipantId) return;
        
        const { data, error } = await supabase
          .from('session_participants')
          .select('*')
          .eq('conversation_id', props.currentConversationId)
          .eq('participant_id', props.currentUserParticipantId)
          .single();
          
        if (error || !data) {
          // Only redirect if we're certain the participant was removed
          // and we're not in the middle of a session transition
          if (!participantNavigationLockRef.current && !sessionStarted) {
            console.log("Participant has been removed from the session");
            
            // Clear storage and redirect
            try {
              localStorage.removeItem('participant_session');
              sessionStorage.removeItem('isAdminSession');
            } catch (err) {
              console.error("Error clearing session storage:", err);
            }
            
            toast({
              title: "Session access revoked",
              description: "You can no longer access this session",
              variant: "destructive"
            });
            
            navigate('/');
          }
        }
      } catch (err) {
        console.error("Error checking participant status:", err);
      }
    };
    
    // Initial check with delay to allow for session stabilization
    const timeoutId = setTimeout(checkParticipantStatus, 2000);
    
    // Set up periodic check with longer intervals during active sessions
    const intervalId = setInterval(checkParticipantStatus, sessionStarted ? 30000 : 15000);
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [props.currentConversationId, props.currentUserParticipantId, isAdmin, navigate, toast, sessionStarted]);
  
  // Calculate values from conversation and participants if available
  const currentParticipants = props.conversation?.current_participants || 
                             props.participants?.length || 0;
  const maxParticipants = props.conversation?.participants || 0;
  const isSessionFull = maxParticipants > 0 && currentParticipants >= maxParticipants;
  
  // Enhanced session full handling with navigation lock
  useEffect(() => {
    if (isSessionFull && onSessionFull && !sessionFullTriggeredRef.current) {
      console.log("Session is full, triggering onSessionFull callback");
      sessionFullTriggeredRef.current = true;
      
      // Set navigation lock for participants to prevent redirects during auto-start
      if (!isAdmin) {
        participantNavigationLockRef.current = true;
        console.log("Setting participant navigation lock during session auto-start");
        
        // Clear the lock after session has time to stabilize
        setTimeout(() => {
          participantNavigationLockRef.current = false;
          console.log("Participant navigation lock cleared");
        }, 5000);
      }
      
      setSessionStarted(true);
      if (onSessionFull) onSessionFull();
    }
  }, [isSessionFull, onSessionFull, setSessionStarted, isAdmin]);
  
  // Reset transition state after a maximum timeout
  useEffect(() => {
    if (isTransitioning) {
      // Clear any existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      
      // Set a maximum transition time of 3 seconds
      transitionTimeoutRef.current = setTimeout(() => {
        console.log("Transition timeout reached, forcing completion");
        setIsTransitioning(false);
        setShouldShowSession(true);
      }, 3000);
    }
    
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [isTransitioning]);
  
  // Special handling for admin paths - always show session
  useEffect(() => {
    if (isOnAdminPath && !shouldShowSession) {
      console.log("Admin path detected, forcing session display");
      setShouldShowSession(true);
      setSessionStarted(true);
    }
  }, [isOnAdminPath, shouldShowSession, setSessionStarted]);
  
  // Main transition effect with improved handling
  useEffect(() => {
    // CRITICAL FIX: Always show session if it's already started in DB
    if (props.isSessionStartedInDB && !shouldShowSession) {
      console.log("Session already started in DB, showing session");
      setShouldShowSession(true);
      setSessionStarted(true);
      return;
    }
    
    // Track session started changes
    if (sessionStarted !== lastSessionStartedRef.current) {
      console.log(`Session started changed from ${lastSessionStartedRef.current} to ${sessionStarted}`);
      lastSessionStartedRef.current = sessionStarted;
      
      if (sessionStarted) {
        console.log("Transitioning to session view...");
        setIsTransitioning(true);
        
        // Short timeout to simulate transition
        setTimeout(() => {
          setIsTransitioning(false);
          setShouldShowSession(true);
        }, 500);
      }
    }
  }, [sessionStarted, props.isSessionStartedInDB, shouldShowSession, setSessionStarted]);
  
  // Handle start session action
  const handleStartSession = useCallback(() => {
    console.log("Starting session in useSessionStateTransition");
    setSessionStarted(true);
    props.handleStartSession();
  }, [props, setSessionStarted]);

  return {
    isTransitioning,
    shouldShowSession,
    currentParticipants,
    maxParticipants,
    isSessionFull,
    handleStartSession
  };
}
