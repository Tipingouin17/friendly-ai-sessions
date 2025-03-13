
import { useState, useEffect } from "react";
import { ParticipantInfo } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";

export function useParticipantDatabase(conversationId?: number | null) {
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch existing participants from session_participants table
  useEffect(() => {
    if (!conversationId) {
      console.log("No conversationId provided to useParticipantDatabase, skipping fetch");
      setIsLoading(false);
      return () => {};
    }
    
    let isMounted = true;
    
    async function fetchParticipants() {
      setIsLoading(true);
      
      try {
        console.log("Fetching participants for conversation:", conversationId);
        
        const { data, error } = await supabase
          .from('session_participants')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('participant_id', { ascending: true });
          
        if (error) {
          console.error("Error fetching participants:", error);
          return;
        }
        
        if (data && data.length > 0 && isMounted) {
          console.log("Fetched participants from database:", data);
          
          const participantsList: ParticipantInfo[] = data.map(participant => ({
            id: participant.participant_id,
            name: participant.name,
            avatar: participant.avatar_seed 
              ? `/api/avatar?name=${participant.avatar_seed}&variant=beam&palette=0` 
              : null,
            isAnonymous: participant.is_anonymous || false
          }));
          
          console.log("Processed participant list:", participantsList);
          setParticipants(participantsList);
        }
      } catch (err) {
        console.error("Exception fetching participants:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    
    fetchParticipants();
    
    return () => {
      isMounted = false;
    };
  }, [conversationId]);
  
  return { participants, setParticipants, isLoading };
}
