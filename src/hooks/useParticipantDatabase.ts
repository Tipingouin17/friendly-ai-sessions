
import { useState, useEffect } from 'react';
import { ParticipantInfo } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';

export function useParticipantDatabase(conversationId: number | null) {
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) {
      setIsLoading(false);
      return;
    }

    console.log(`Fetching participants for conversation: ${conversationId}`);
    
    const fetchParticipants = async () => {
      try {
        const { data: participantsData, error } = await supabase
          .from('session_participants')
          .select(`
            participant_id,
            name,
            avatar_seed,
            is_anonymous,
            is_admin,
            created_at
          `)
          .eq('conversation_id', conversationId);

        if (error) {
          console.error('Error fetching participants:', error);
          setIsLoading(false);
          return;
        }

        if (participantsData && participantsData.length > 0) {
          const formattedParticipants: ParticipantInfo[] = participantsData.map(p => ({
            id: p.participant_id,
            name: p.name || `Participant ${p.participant_id}`,
            avatar: p.avatar_seed ? `/api/avatar?name=${p.avatar_seed}&variant=beam&palette=0` : null,
            avatarSeed: p.avatar_seed || null,
            isAnonymous: p.is_anonymous || false,
            isAdmin: p.is_admin || false,
            joinedAt: new Date(p.created_at),
            lastActive: new Date(p.created_at),
          }));

          console.log(`Found ${formattedParticipants.length} participants`);
          setParticipants(formattedParticipants);
        }
      } catch (err) {
        console.error('Error in fetchParticipants:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParticipants();
  }, [conversationId]);

  return { 
    participants, 
    setParticipants, 
    isLoading 
  };
}
