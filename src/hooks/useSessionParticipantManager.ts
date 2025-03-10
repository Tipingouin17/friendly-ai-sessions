import { useState, useEffect, useCallback } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { useParticipantCounts } from "@/hooks/useParticipantCounts";
import { useParticipantChannel } from "@/hooks/useParticipantChannel";
import { useRealtimeConnectionHandler } from "@/hooks/useRealtimeConnectionHandler";
import { supabase } from "@/integrations/supabase/client";

interface UseSessionParticipantManagerProps {
  conversationId: number | null;
  conversation: ConversationWithSession | null;
  refetch: () => void;
  onSessionFull?: () => void;
  locationState?: { 
    participantId?: number; 
    isGuest?: boolean; 
    participantName?: string;
  } | null;
}

export function useSessionParticipantManager({
  conversationId,
  conversation,
  refetch,
  onSessionFull,
  locationState
}: UseSessionParticipantManagerProps) {
  // Participant state
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Determine current participant ID
  const currentUserParticipantId = locationState?.participantId || null;
  
  // Realtime connection management
  const {
    isConnected,
    setIsConnected,
    connectionAttempts,
    attemptReconnection,
    connectionError
  } = useRealtimeConnectionHandler({
    conversationId,
    refetch,
    onConnectionError: (err) => setError(err)
  });

  // Participant counts management
  const {
    currentParticipantCount,
    setCurrentParticipantCount,
    maxParticipantsForSession,
    setMaxParticipantsForSession
  } = useParticipantCounts(conversation);

  // Set up participant channel
  const { error: channelError } = useParticipantChannel({
    conversationId,
    setIsConnected,
    attemptReconnection,
    setCurrentParticipantCount,
    setMaxParticipantsForSession,
    refetch
  });

  // Function to force refresh participant data
  const forceRefreshParticipants = useCallback(async (): Promise<void> => {
    if (!conversationId) {
      return Promise.resolve();
    }
    
    try {
      console.log("Forcibly refreshing participant data for conversation:", conversationId);
      
      const { data, error } = await supabase
        .from('session_participants')
        .select('*')
        .eq('conversation_id', conversationId);
        
      if (error) {
        console.error("Error fetching participant data:", error);
        return Promise.resolve();
      }
      
      if (data && data.length > 0) {
        console.log("Retrieved updated participant data:", data.length, "participants");
        
        const updatedParticipants: ParticipantInfo[] = data.map(p => ({
          id: p.participant_id,
          name: p.name || `Participant ${p.participant_id}`,
          avatar: p.avatar_seed ? `/api/avatar?name=${p.avatar_seed}&variant=beam&palette=0` : null,
          isAnonymous: p.is_anonymous || false
        }));
        
        setParticipants(updatedParticipants);
      } else if (conversation?.current_participants) {
        const count = conversation.current_participants;
        console.log("No participant data found, creating placeholders for", count, "participants");
        
        const placeholders: ParticipantInfo[] = Array.from({ length: count }, (_, i) => ({
          id: i + 1,
          name: `Participant ${i + 1}`,
          avatar: null,
          isAnonymous: false
        }));
        
        setParticipants(placeholders);
      }
      
      return Promise.resolve();
    } catch (err) {
      console.error("Error in forceRefreshParticipants:", err);
      return Promise.resolve();
    }
  }, [conversationId, conversation?.current_participants]);

  // Initial load of participants
  useEffect(() => {
    forceRefreshParticipants();
  }, [forceRefreshParticipants]);

  // Handle channel errors
  useEffect(() => {
    if (channelError) {
      console.error("Participant channel error:", channelError);
      setError(channelError);
    }
  }, [channelError]);

  // Check if session is full
  const isSessionFull = useCallback(() => {
    const isFull = maxParticipantsForSession > 0 && 
           currentParticipantCount >= maxParticipantsForSession;
           
    if (isFull && onSessionFull) {
      console.log("Session is full, triggering onSessionFull callback");
      onSessionFull();
    }
    
    return isFull;
  }, [currentParticipantCount, maxParticipantsForSession, onSessionFull]);

  // Update parent components when session becomes full
  useEffect(() => {
    isSessionFull();
  }, [isSessionFull]);

  // Update participants based on conversation data
  useEffect(() => {
    if (conversation && conversation.current_participants > 0) {
      if (conversation.current_participants > participants.length) {
        console.log("Updating participants based on conversation count:", 
                    conversation.current_participants, "current:", participants.length);
        
        forceRefreshParticipants();
      }
    }
  }, [conversation, participants.length, forceRefreshParticipants]);

  // Force periodic refresh of participant data to ensure UI stays updated
  useEffect(() => {
    if (conversationId) {
      const intervalId = setInterval(() => {
        forceRefreshParticipants();
      }, 10000); // Refresh every 10 seconds
      
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [conversationId, forceRefreshParticipants]);

  return {
    participants,
    setParticipants,
    isConnected,
    connectionAttempts,
    currentParticipantCount,
    maxParticipantsForSession,
    currentUserParticipantId,
    isSessionFull: isSessionFull(),
    error: connectionError || error,
    forceRefreshParticipants
  };
}
