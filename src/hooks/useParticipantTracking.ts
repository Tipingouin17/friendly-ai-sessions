
import { useState, useEffect } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { removeChannel } from "@/utils/realtimeHelpers";

export function useParticipantTracking(
  conversationState: { participantName?: string; avatarSeed?: string; isGuest?: boolean; participantId?: number } | null,
  conversation: ConversationWithSession | null,
  conversationId?: number | null
) {
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize participants based on conversation data
  useEffect(() => {
    if (conversation && conversation.current_participants > 0) {
      console.log("Initializing participants from conversation data:", conversation.current_participants);
      
      const initialParticipants: ParticipantInfo[] = [];
      
      for (let i = 1; i <= conversation.current_participants; i++) {
        initialParticipants.push({
          id: i,
          name: `Participant ${i}`,
          avatar: null,
          isAnonymous: false
        });
      }
      
      setParticipants(initialParticipants);
      setIsLoading(false);
    }
  }, [conversation]);
  
  // Add participant from location state (for guests joining)
  useEffect(() => {
    if (conversationState?.isGuest) {
      console.log("Guest participant joining with data:", conversationState);
      
      if (conversationState.participantName && conversationState.participantId) {
        const avatarUrl = conversationState.avatarSeed 
          ? `/api/avatar?name=${conversationState.avatarSeed}&variant=beam&palette=0` 
          : null;
          
        setParticipants(prev => {
          const exists = prev.some(p => p.id === conversationState.participantId);
          if (exists) return prev;
          
          console.log("Adding participant with ID:", conversationState.participantId);
          return [...prev, {
            id: conversationState.participantId!,
            name: conversationState.participantName!,
            avatar: avatarUrl,
            isAnonymous: false
          }];
        });
      }
    }
  }, [conversationState]);
  
  // Set up realtime subscription for participant updates
  useEffect(() => {
    if (!conversationId) return;
    
    console.log("Setting up realtime participant tracking for conversation:", conversationId);
    setIsLoading(true);
    
    const eventsChannel = supabase
      .channel(`admin-participant-events-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_events',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        console.log("Admin received participant event:", payload);
        
        if (payload.new) {
          const eventData = payload.new.data;
          const eventType = payload.new.event_type;
          
          if (eventType === 'participant_joined' && eventData) {
            const participantId = eventData.participant_id;
            
            setParticipants(prev => {
              // Check if we already have this participant
              if (prev.some(p => p.id === participantId)) return prev;
              
              console.log("Adding new participant from event:", participantId);
              return [...prev, {
                id: participantId,
                name: eventData.participant_name || `Participant ${participantId}`,
                avatar: eventData.avatar_url || null,
                isAnonymous: eventData.is_anonymous || false
              }];
            });
          }
        }
      })
      .subscribe();
      
    setIsLoading(false);
      
    return () => {
      removeChannel(eventsChannel);
    };
  }, [conversationId]);
  
  return {
    participants,
    setParticipants,
    isLoading
  };
}
