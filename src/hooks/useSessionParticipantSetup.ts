
import { useState, useEffect, useCallback, useRef } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { LocationStateType } from "@/hooks/useConversationId";
import { getParticipantInfo } from "@/utils/participantUtils";
import { supabase } from "@/integrations/supabase/client";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";
import { useSessionRealtime } from "@/hooks/useSessionRealtime";

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
  conversation,
  locationState,
  refetch,
  onError,
  onSessionFull,
  forceAdmin
}: UseSessionParticipantSetupProps) => {
  useEffect(() => {
    console.log("useSessionParticipantSetup running...");
  }, []);

  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [currentUserParticipantId, setCurrentUserParticipantId] = useState<number | null>(null);
  const [currentParticipantCount, setCurrentParticipantCount] = useState(0);
  const [maxParticipantsForSession, setMaxParticipantsForSession] = useState(0);
  const [isSessionFull, setIsSessionFull] = useState(false);
  const { isAdmin, setAdminStatus } = useSessionAdminStatus();
  const adminStatusSetRef = useRef(false);
  const sessionFullCalledRef = useRef(false);
  
  // Enforce admin status if forceAdmin is true
  useEffect(() => {
    if (forceAdmin && !adminStatusSetRef.current) {
      //console.log("useSessionParticipantSetup: Enforcing admin status with forceAdmin=true");
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
      adminStatusSetRef.current = true;
    }
  }, [forceAdmin, setAdminStatus]);
  
  // Load participants when conversation changes
  useEffect(() => {
    const loadParticipants = async () => {
      if (!conversationId) return;
      
      try {
        //console.log("Loading participants for conversation:", conversationId);
        
        const { data, error } = await supabase
          .from('session_participants')
          .select('*')
          .eq('conversation_id', conversationId);
          
        if (error) {
          console.error("Error loading participants:", error);
          if (onError) onError("Failed to load session participants");
          return;
        }
        
        if (!data || data.length === 0) {
          //console.log("No participants found for conversation:", conversationId);
          return;
        }
        
        // Process participants
        const participantPromises = data.map(async (participant) => {
          try {
            return await getParticipantInfo(participant);
          } catch (err) {
            //console.error("Error getting participant info:", err);
            return null;
          }
        });
        
        const participantInfos = (await Promise.all(participantPromises)).filter(Boolean) as ParticipantInfo[];
        //console.log("Loaded participants:", participantInfos.length);
        setParticipants(participantInfos);
        
        // Set current participant ID from location state if available
        if (locationState?.participantId) {
          //console.log("Setting current participant ID from location state:", locationState.participantId);
          setCurrentUserParticipantId(locationState.participantId);
        }
      } catch (err) {
        //console.error("Error in loadParticipants:", err);
        if (onError) onError("Failed to load session participants");
      }
    };
    
    loadParticipants();
  }, [conversationId, locationState, onError]);
  
  // Update participant counts when conversation or participants change
  useEffect(() => {
    if (conversation) {
      const maxParticipants = conversation.participants || 0;
      const currentCount = conversation.current_participants || 0;
      
      /*console.log("Participant counts:", {
        max: maxParticipants,
        current: currentCount,
        fromArray: participants.length
      });*/
      
      setMaxParticipantsForSession(maxParticipants);
      setCurrentParticipantCount(currentCount);
      
      // Check if session is full
      const isFull = maxParticipants > 0 && currentCount >= maxParticipants;
      setIsSessionFull(isFull);
      
      // Call onSessionFull if session is full and not already called
      if (isFull && onSessionFull && !sessionFullCalledRef.current && !forceAdmin) {
        //console.log("Session is full, calling onSessionFull");
        sessionFullCalledRef.current = true;
        onSessionFull();
      }
    }
  }, [conversation, participants, onSessionFull, forceAdmin]);
  
  // Set up realtime updates for participants
  const { error: realtimeError } = useSessionRealtime({
    currentConversationId: conversationId,
    participants,
    setParticipants,
    conversation,
    refetch,
    handleSessionFull: onSessionFull,
    onSessionStarted: () => {}
  });
  
  // Handle realtime errors
  useEffect(() => {
    if (realtimeError && onError) {
      onError(realtimeError);
    }
  }, [realtimeError, onError]);
  
  // Force refresh participants function
  const forceRefreshParticipants = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      //console.log("Forcing refresh of participants");
      
      const { data, error } = await supabase
        .from('session_participants')
        .select('*')
        .eq('conversation_id', conversationId);
        
      if (error) {
        console.error("Error refreshing participants:", error);
        return;
      }
      
      if (!data || data.length === 0) {
        //console.log("No participants found during refresh");
        return;
      }
      
      // Process participants
      const participantPromises = data.map(async (participant) => {
        try {
          return await getParticipantInfo(participant);
        } catch (err) {
          console.error("Error getting participant info during refresh:", err);
          return null;
        }
      });
      
      const participantInfos = (await Promise.all(participantPromises)).filter(Boolean) as ParticipantInfo[];
      console.log("Refreshed participants:", participantInfos.length);
      setParticipants(participantInfos);
    } catch (err) {
      //console.error("Error in forceRefreshParticipants:", err);
    }
  }, [conversationId]);
  
  return {
    participants,
    currentUserParticipantId,
    currentParticipantCount,
    maxParticipantsForSession,
    isSessionFull,
    forceRefreshParticipants
  };
};
