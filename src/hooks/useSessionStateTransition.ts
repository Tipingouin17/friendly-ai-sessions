
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
  const isOnAdminPath = window.location.pathname.includes('/admin');
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Track participant removal events for this participant
  useEffect(() => {
    if (!props.currentConversationId || !props.currentUserParticipantId || isAdmin) return;
    
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
      } catch (err) {
        console.error("Error checking participant status:", err);
      }
    };
    
    // Initial check
    checkParticipantStatus();
    
    // Set up periodic check
    const intervalId = setInterval(checkParticipantStatus, 15000); // Check every 15 seconds
    
    return () => {
      clearInterval(intervalId);
    };
  }, [props.currentConversationId, props.currentUserParticipantId, isAdmin, navigate, toast]);
  
  // Calculate values from conversation and participants if available
  const currentParticipants = props.conversation?.current_participants || 
                             props.participants?.length || 0;
  const maxParticipants = props.conversation?.participants || 0;
  const isSessionFull = maxParticipants > 0 && currentParticipants >= maxParticipants;
  
  // Handle session full condition
  useEffect(() => {
    // Safety check to prevent duplicate calls
    if (isSessionFull && onSessionFull && !lastSessionStartedRef.current) {
      console.log("Session is full, triggering onSessionFull callback");
      setSessionStarted(true);
      if (onSessionFull) onSessionFull();
    }
  }, [isSessionFull, onSessionFull, setSessionStarted]);
  
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
  
  // Main transition effect
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
