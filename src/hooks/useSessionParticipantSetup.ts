
import { useState, useEffect } from "react";
import { useSessionParticipants } from "@/hooks/useSessionParticipants";
import { ConversationWithSession } from "@/types/database";
import { ParticipantInfo } from "@/types/chat";
import { LocationStateType } from "@/hooks/useConversationId";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";

type UseSessionParticipantSetupProps = {
  conversationId: number | null;
  conversation: ConversationWithSession | null;
  locationState: LocationStateType | null;
  refetch: () => void;
  onError?: (error: string) => void;
  onSessionFull?: () => void;
  forceAdmin?: boolean; // Added forceAdmin prop
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
  
  // Enforce admin status if forceAdmin is true
  useEffect(() => {
    if (forceAdmin) {
      console.log("useSessionParticipantSetup: Enforcing admin status with forceAdmin=true");
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
    }
  }, [forceAdmin, setAdminStatus]);
  
  // Get participants using the hook - fixed to pass only conversationId
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
  
  // Handle session full logic
  useEffect(() => {
    // Skip check if admin
    if ((isAdmin || forceAdmin) && conversationId) {
      console.log("Admin user detected, skipping session full check");
      return;
    }
    
    // Check if session is full for non-admin users
    const isFull = currentParticipantCount >= maxParticipantsForSession;
    
    if (isFull && !isSessionFull && conversationId) {
      console.log("Session is full, notifying:", {
        currentCount: currentParticipantCount,
        maxAllowed: maxParticipantsForSession
      });
      
      setIsSessionFull(true);
      
      if (onSessionFull) {
        onSessionFull();
      }
      
      if (onError) {
        onError("This session is full and cannot accept more participants.");
      }
    }
  }, [
    currentParticipantCount, 
    maxParticipantsForSession, 
    isSessionFull, 
    conversationId,
    onSessionFull,
    onError,
    isAdmin,
    forceAdmin
  ]);
  
  return {
    participants,
    currentUserParticipantId,
    currentParticipantCount,
    maxParticipantsForSession,
    isSessionFull,
    isParticipantTracking: true // Added this property since it was expected in the return value
  };
};
