/**
 * use Session State Transition
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { SessionContextProps } from "@/types/session";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
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
        
        const { data, error } = await api
          .from('session_participants')
          .select('*')
          .eq('conversation_id', props.currentConversationId)
          .eq('participant_id', props.currentUserParticipantId)
          .single();
          
        if (error || !data) {
          // Only redirect if we're certain the participant was removed
          // and we're not in the middle of a session transition
          if (!participantNavigationLockRef.current && !sessionStarted) {
            
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
  
  // Calculate values from conversation and participants if available.
  // The DB stores participants as host-inclusive (host + attendees).
  // Subtract 1 from both current and max so participant-facing UI shows
  // attendee-only counts (consistent with JoinSessionMain BUG 3 fix).
  const rawCurrentParticipants = props.conversation?.current_participants || 
                             props.participants?.length || 0;
  const rawMaxParticipants = props.conversation?.participants || 0;
  const currentParticipants = Math.max(rawCurrentParticipants - 1, 0);
  const maxParticipants = rawMaxParticipants > 0 ? Math.max(rawMaxParticipants - 1, 0) : 0;
  const isSessionFull = maxParticipants > 0 && currentParticipants >= maxParticipants;
  
  // Full capacity no longer starts the room locally. The redesigned waiting-room
  // flow requires the host's explicit Start Session action, and participants move
  // to the live view only after the database-backed session_started flag changes.
  useEffect(() => {
    if (isSessionFull && onSessionFull && !sessionFullTriggeredRef.current) {
      sessionFullTriggeredRef.current = true;
      if (onSessionFull) onSessionFull();
    }
  }, [isSessionFull, onSessionFull]);
  
  // Reset transition state after a maximum timeout
  useEffect(() => {
    if (isTransitioning) {
      // Clear any existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      
      // Set a maximum transition time of 3 seconds
      transitionTimeoutRef.current = setTimeout(() => {
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
      setShouldShowSession(true);
      setSessionStarted(true);
    }
  }, [isOnAdminPath, shouldShowSession, setSessionStarted]);
  
  // Main transition effect with improved handling
  useEffect(() => {
    // CRITICAL FIX: Always show session if it's already started in DB
    if (props.isSessionStartedInDB && !shouldShowSession) {
      setShouldShowSession(true);
      setSessionStarted(true);
      return;
    }
    
    // Track session started changes
    if (sessionStarted !== lastSessionStartedRef.current) {
      lastSessionStartedRef.current = sessionStarted;
      
      if (sessionStarted) {
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
