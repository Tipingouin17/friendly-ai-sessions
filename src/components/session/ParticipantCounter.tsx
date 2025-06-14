
import React, { useEffect, useState } from 'react';
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ParticipantCounterProps {
  currentParticipants: number;
  maxParticipants: number;
  conversationId?: number | null;
}

const ParticipantCounter: React.FC<ParticipantCounterProps> = ({
  currentParticipants,
  maxParticipants,
  conversationId
}) => {
  const [displayCount, setDisplayCount] = useState(currentParticipants);
  
  // Update from props when they change
  useEffect(() => {
    setDisplayCount(currentParticipants);
  }, [currentParticipants]);
  
  // Set up realtime listener for participant count changes
  useEffect(() => {
    if (!conversationId) return;
    
    // Create a unique channel name
    const channelName = `participant-count-${conversationId}-${Date.now()}`;
    
    // Listen for changes to current_participants in the conversation
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        console.log("Participant count update payload:", payload);
        
        if (payload.new && typeof payload.new.current_participants === 'number') {
          console.log(`Setting counter display count to ${payload.new.current_participants}`);
          setDisplayCount(payload.new.current_participants);
        }
      })
      .subscribe((status) => {
        console.log(`ParticipantCounter channel ${channelName} status:`, status);
      });
      
    // Also listen for participant removal events
    const eventsChannel = supabase
      .channel(`count-events-${conversationId}-${Date.now()}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'session_events',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        console.log("Count event:", payload);
        
        if (payload.new && payload.new.data) {
          const eventData = payload.new.data;
          const eventType = payload.new.event_type;
          
          // Update count for both join and removal events
          if ((eventType === 'participant_joined' || eventType === 'participant_removed') &&
              typeof eventData.current_count === 'number') {
            console.log(`Setting counter display count from ${eventType} event to ${eventData.current_count}`);
            setDisplayCount(eventData.current_count);
          }
        }
      })
      .subscribe();
    
    return () => {
      try {
        supabase.removeChannel(channel);
        supabase.removeChannel(eventsChannel);
      } catch (err) {
        console.error("Error removing participant counter channels:", err);
      }
    };
  }, [conversationId]);
  
  return (
    <div className="flex items-center mr-4 bg-gray-50 px-3 py-1 rounded-full">
      <Users size={16} className="text-gray-500 mr-1" />
      <span className="text-sm font-medium">
        {displayCount}/{maxParticipants}
      </span>
    </div>
  );
};

export default ParticipantCounter;
