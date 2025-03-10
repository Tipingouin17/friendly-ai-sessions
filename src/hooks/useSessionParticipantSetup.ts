
import { useState, useEffect, useCallback } from "react";
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
  
  // This will store if we're processing as admin to use throughout the component
  const [effectiveIsAdmin, setEffectiveIsAdmin] = useState(false);
  
  // Enforce admin status if forceAdmin is true
  useEffect(() => {
    // Determine if we're effectively an admin through any of our sources
    const adminByForceFlag = forceAdmin === true;
    const adminByLocationState = locationState?.isAdmin === true;
    const adminByStatus = isAdmin === true;
    
    // Calculate effective admin status
    const newEffectiveAdmin = adminByForceFlag || adminByLocationState || adminByStatus;
    
    if (newEffectiveAdmin) {
      console.log("useSessionParticipantSetup: Setting effectiveIsAdmin=true based on:", {
        forceAdmin: adminByForceFlag,
        locationStateAdmin: adminByLocationState,
        isAdminStatus: adminByStatus
      });
      
      // Persist the admin status to ensure it's available elsewhere in the app
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
      setEffectiveIsAdmin(true);
    } else {
      setEffectiveIsAdmin(false);
    }
  }, [forceAdmin, locationState, isAdmin, setAdminStatus]);
  
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
      isAdmin,
      effectiveIsAdmin,
      forceAdmin,
      isSessionFull
    });
  }, [conversationId, currentParticipantCount, maxParticipantsForSession, isAdmin, effectiveIsAdmin, forceAdmin, isSessionFull]);
  
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
    console.log("Session full check:", {
      currentCount: currentParticipantCount,
      maxAllowed: maxParticipantsForSession,
      isAdmin: effectiveIsAdmin,
      isSessionFull
    });
    
    // ALWAYS skip check if admin - they should never see the session as full
    if (effectiveIsAdmin) {
      console.log("Admin user detected in useSessionParticipantSetup, skipping session full check");
      // If we previously set session as full but now we're admin, reset it
      if (isSessionFull) {
        setIsSessionFull(false);
      }
      return;
    }
    
    // Check if session is full for non-admin users
    // Only consider the session full if maxParticipantsForSession is greater than 0
    // and currentParticipantCount is greater than or equal to maxParticipantsForSession
    const isFull = maxParticipantsForSession > 0 && currentParticipantCount >= maxParticipantsForSession;
    
    if (isFull && !isSessionFull && conversationId) {
      console.log("Session is full, notifying:", {
        currentCount: currentParticipantCount,
        maxAllowed: maxParticipantsForSession,
        isAdmin: effectiveIsAdmin
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
    effectiveIsAdmin,
    toast
  ]);
  
  return {
    participants,
    currentUserParticipantId,
    currentParticipantCount,
    maxParticipantsForSession,
    isSessionFull,
    isParticipantTracking: true,
    forceRefreshParticipants,
    isAdmin: effectiveIsAdmin // Expose the calculated admin status
  };
};
