
import { useState, useEffect, useCallback, useRef } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { LocationStateType } from "@/hooks/useConversationId";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";
import { useCoordinatedSessionData } from "@/hooks/useCoordinatedSessionData";

type UseSessionParticipantSetupProps = {
  conversationId: number | null;
  conversation: ConversationWithSession | null;
  locationState: LocationStateType | null;
  refetch: () => void;
  onError?: (error: string) => void;
  onSessionFull?: () => void;
  forceAdmin?: boolean;
};

export const useSessionParticipantSetup = ({
  conversationId,
  conversation: propConversation,
  locationState,
  refetch,
  onError,
  onSessionFull,
  forceAdmin
}: UseSessionParticipantSetupProps) => {
  const [currentUserParticipantId, setCurrentUserParticipantId] = useState<number | null>(null);
  const [isSessionFull, setIsSessionFull] = useState(false);
  const { isAdmin, setAdminStatus } = useSessionAdminStatus();
  const adminStatusSetRef = useRef(false);
  const sessionFullCalledRef = useRef(false);
  
  // Use coordinated session data
  const {
    conversation: sessionConversation,
    participants,
    error: dataError,
    connectionHealthy,
    refetch: refetchSessionData
  } = useCoordinatedSessionData({
    conversationId,
    isAdmin: forceAdmin || isAdmin
  });
  
  // Use the session conversation if available, otherwise fall back to prop
  const conversation = sessionConversation || propConversation;
  
  // Enforce admin status if forceAdmin is true
  useEffect(() => {
    if (forceAdmin && !adminStatusSetRef.current) {
      console.log("useSessionParticipantSetup: Enforcing admin status with forceAdmin=true");
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
      adminStatusSetRef.current = true;
    }
  }, [forceAdmin, setAdminStatus]);
  
  // Set current participant ID from location state if available
  useEffect(() => {
    if (locationState?.participantId) {
      console.log("Setting current participant ID from location state:", locationState.participantId);
      setCurrentUserParticipantId(locationState.participantId);
    }
  }, [locationState]);
  
  // Update participant counts when conversation or participants change
  const currentParticipantCount = conversation?.current_participants || 0;
  const maxParticipantsForSession = conversation?.participants || 0;
  
  useEffect(() => {
    if (conversation) {
      console.log("Participant counts:", {
        max: maxParticipantsForSession,
        current: currentParticipantCount,
        fromArray: participants.length
      });
      
      // Check if session is full
      const isFull = maxParticipantsForSession > 0 && currentParticipantCount >= maxParticipantsForSession;
      setIsSessionFull(isFull);
      
      // Call onSessionFull if session is full and not already called
      if (isFull && onSessionFull && !sessionFullCalledRef.current && !forceAdmin) {
        console.log("Session is full, calling onSessionFull");
        sessionFullCalledRef.current = true;
        onSessionFull();
      }
    }
  }, [conversation, participants, onSessionFull, forceAdmin, maxParticipantsForSession, currentParticipantCount]);
  
  // Handle data errors
  useEffect(() => {
    if (dataError && onError && connectionHealthy === false) {
      console.error("Session data error:", dataError);
      onError(dataError);
    }
  }, [dataError, onError, connectionHealthy]);
  
  // Force refresh participants function - now uses coordinated refetch
  const forceRefreshParticipants = useCallback(async () => {
    if (!conversationId) return;
    
    console.log("Forcing refresh of participants via coordinated data");
    refetchSessionData();
    
    // Also trigger the original refetch for backwards compatibility
    refetch();
  }, [conversationId, refetchSessionData, refetch]);
  
  return {
    participants,
    currentUserParticipantId,
    currentParticipantCount,
    maxParticipantsForSession,
    isSessionFull,
    forceRefreshParticipants,
    connectionHealthy
  };
};
