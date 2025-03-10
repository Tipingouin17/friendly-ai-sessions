
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
  
  // Enforce admin status if forceAdmin is true
  useEffect(() => {
    if (forceAdmin) {
      console.log("useSessionParticipantSetup: Enforcing admin status with forceAdmin=true");
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
    }
  }, [forceAdmin, setAdminStatus]);
  
  // Get participants using the hook
  const participantsData = useSessionParticipants(conversationId);
  
  // Extract needed properties from participantsData
  const {
    currentParticipantCount,
    maxParticipantsForSession,
  } = participantsData;
  
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
    const effectiveIsAdmin = isAdmin || forceAdmin === true;
    console.log("Session full check:", {
      currentCount: currentParticipantCount,
      maxAllowed: maxParticipantsForSession,
      isAdmin: effectiveIsAdmin,
      isSessionFull
    });
    
    // Always skip check if admin - they should never see the session as full
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
    isAdmin,
    forceAdmin,
    toast
  ]);
  
  return {
    participants,
    currentUserParticipantId,
    currentParticipantCount,
    maxParticipantsForSession,
    isSessionFull,
    isParticipantTracking: true,
    forceRefreshParticipants
  };
};
