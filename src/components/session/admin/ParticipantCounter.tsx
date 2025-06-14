
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
    console.log('ParticipantCounter: Updating display count to', currentParticipants);
    setDisplayCount(currentParticipants);
  }, [currentParticipants]);
  
  // Set up realtime listener for participant count changes
  useEffect(() => {
    if (!conversationId) return;
    
    // Create a unique channel name
    const channelName = `admin-participant-count-${conversationId}-${Date.now()}`;
    
    // Listen for changes to current_participants in the conversation
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        console.log("Admin counter: Participant count update payload:", payload);
        
        if (payload.new && typeof payload.new.current_participants === 'number') {
          console.log(`Admin counter: Setting display count to ${payload.new.current_participants}`);
          setDisplayCount(payload.new.current_participants);
        }
      })
      .subscribe((status) => {
        console.log(`Admin ParticipantCounter channel ${channelName} status:`, status);
      });
      
    // Also listen for participant table changes to update count
    const participantsChannel = supabase
      .channel(`admin-participants-${conversationId}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_participants',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
        console.log("Admin counter: Participant table change:", payload);
        
        // Refetch participant count from database
        const { data, error } = await supabase
          .from('session_participants')
          .select('participant_id', { count: 'exact' })
          .eq('conversation_id', conversationId);
          
        if (!error && data) {
          const actualCount = data.length;
          console.log(`Admin counter: Setting display count from participant table to ${actualCount}`);
          setDisplayCount(actualCount);
        }
      })
      .subscribe();
    
    return () => {
      try {
        supabase.removeChannel(channel);
        supabase.removeChannel(participantsChannel);
      } catch (err) {
        console.error("Error removing admin participant counter channels:", err);
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
