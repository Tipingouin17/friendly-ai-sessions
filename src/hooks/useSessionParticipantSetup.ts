
import { useState, useEffect, useCallback, useRef } from "react";
import { useSessionParticipants } from "@/hooks/useSessionParticipants";
import { ConversationWithSession } from "@/types/database";
import { ParticipantInfo } from "@/types/chat";
import { LocationStateType } from "@/hooks/useConversationId";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";
import { useToast } from "@/components/ui/use-toast";

type UseSessionParticipantSetupProps = {
  conversationId: number | null;
  conversation: ConversationWithSession | null;
  locationState: LocationStateType | null;
  refetch: () => Promise<any>; // Ensure this is a Promise
  onError?: (error: string) => void;
  onSessionFull?: () => void;
  forceAdmin?: boolean;
};

export const useSessionParticipantSetup = ({
  conversationId,
  conversation,
  locationState,
  refetch,
  onError,
  onSessionFull,
  forceAdmin
}: UseSessionParticipantSetupProps) => {
  const [isSessionFull, setIsSessionFull] = useState(false);
  const [currentUserParticipantId, setCurrentUserParticipantId] = useState<number | null>(null);
  const { isAdmin, setAdminStatus } = useSessionAdminStatus();
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const { toast } = useToast();
  
  // Use a ref to store and determine admin status just once to prevent loops
  const adminStatusRef = useRef({
    determined: false,
    isAdmin: false
  });
  
  // Determine admin status once and store in ref
  if (!adminStatusRef.current.determined) {
    adminStatusRef.current.isAdmin = forceAdmin === true || 
                                    locationState?.isAdmin === true || 
                                    isAdmin === true || 
                                    sessionStorage.getItem('isAdminSession') === 'true';
    adminStatusRef.current.determined = true;
    
    // Log it
    console.log("useSessionParticipantSetup admin status determined:", adminStatusRef.current.isAdmin);
  }
  
  // Enforce admin status if needed - run only once
  useEffect(() => {
    if (adminStatusRef.current.isAdmin) {
      console.log("useSessionParticipantSetup: Enforcing admin status");
      // This uses the safe version that won't cause re-renders if already set
      setAdminStatus(true);
    }
  }, [setAdminStatus]);
  
  // Get participants using the hook
  const participantsData = useSessionParticipants(conversationId);
  
  // Extract needed properties from participantsData
  const {
    currentParticipantCount,
    maxParticipantsForSession,
  } = participantsData;
  
  // Debug logging
  useEffect(() => {
    console.log("useSessionParticipantSetup current state:", {
      conversationId,
      currentParticipantCount,
      maxParticipantsForSession,
      effectiveIsAdmin: adminStatusRef.current.isAdmin,
      isSessionFull,
      currentUserParticipantId,
      locationStateParticipantId: locationState?.participantId
    });
  }, [conversationId, currentParticipantCount, maxParticipantsForSession,
      isSessionFull, currentUserParticipantId, locationState]);
  
  // Set current user participant ID from location state
  useEffect(() => {
    if (locationState?.participantId) {
      setCurrentUserParticipantId(locationState.participantId);
    }
  }, [locationState]);
  
  // Function to force refresh participants - must return a Promise
  const forceRefreshParticipants = useCallback(async () => {
    if (!conversationId) return Promise.resolve();
    
    try {
      console.log("Forcibly refreshing participant data from useSessionParticipantSetup");
      const result = await refetch();
      return Promise.resolve(result);
    } catch (err) {
      console.error("Error in forceRefreshParticipants:", err);
      return Promise.resolve();
    }
  }, [conversationId, refetch]);
  
  // Handle session full logic with improved admin detection
  useEffect(() => {
    // Skip entirely if we're an admin
    if (adminStatusRef.current.isAdmin) {
      console.log("Admin user detected in useSessionParticipantSetup, skipping session full check");
      if (isSessionFull) {
        setIsSessionFull(false); // Reset if previously set
      }
      return;
    }
    
    // Skip check if the current user is already a participant (they're registered)
    const isCurrentUserAlreadyRegistered = 
      currentUserParticipantId !== null && 
      locationState?.participantId !== undefined;
    
    if (isCurrentUserAlreadyRegistered) {
      console.log("Current user is already registered as a participant, skipping session full check");
      if (isSessionFull) {
        setIsSessionFull(false); // Reset if previously set
      }
      return;
    }
    
    // Use session-specific max or fall back to default
    const effectiveMaxParticipants = maxParticipantsForSession > 0 ? maxParticipantsForSession : 10;
    
    // Check if session is full for non-admin users who aren't already participants
    const isFull = effectiveMaxParticipants > 0 && currentParticipantCount >= effectiveMaxParticipants;
    
    if (isFull && !isSessionFull && conversationId) {
      console.log("Session is full, notifying:", {
        currentCount: currentParticipantCount,
        maxAllowed: effectiveMaxParticipants,
        isAdmin: adminStatusRef.current.isAdmin
      });
      
      setIsSessionFull(true);
      
      if (onSessionFull) {
        onSessionFull();
      }
      
      if (onError) {
        onError("This session is full and cannot accept more participants.");
      }
      
      toast({
        title: "Session Full",
        description: "This session has reached its maximum capacity of participants.",
        variant: "destructive",
      });
    } else if (!isFull && isSessionFull) {
      // Reset the session full state if the conditions no longer apply
      console.log("Session is no longer full, resetting state");
      setIsSessionFull(false);
    }
  }, [
    currentParticipantCount, 
    maxParticipantsForSession, 
    isSessionFull, 
    conversationId,
    onSessionFull,
    onError,
    toast,
    currentUserParticipantId,
    locationState
  ]);
  
  return {
    participants,
    currentUserParticipantId,
    currentParticipantCount,
    maxParticipantsForSession,
    isSessionFull,
    isParticipantTracking: true,
    forceRefreshParticipants,
    isAdmin: adminStatusRef.current.isAdmin // Use the ref value to prevent loops
  };
};
