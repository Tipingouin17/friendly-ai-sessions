/**
 * use Participant Database
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect } from 'react';
import { ParticipantInfo } from '@/types/chat';
import api from "@/lib/api";

export function useParticipantDatabase(conversationId: number | null) {
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) {
      setIsLoading(false);
      return;
    }

    const fetchParticipants = async () => {
      try {
        const { data, error } = await api
          .from('session_participants')
          .select(`
            participant_id,
            name,
            avatar_seed,
            is_anonymous,
            is_host,
            created_at
          `)
          .eq('conversation_id', conversationId);

        if (error) {
          console.error('Error fetching participants:', error);
          return;
        }

        if (data && data.length > 0) {
          const formatted: ParticipantInfo[] = data.map(p => ({
            id: p.participant_id,
            name: p.name || `Participant ${p.participant_id}`,
            avatar: null, // avatarSeed is used directly by ParticipantAvatar via BoringAvatar
            avatarSeed: p.avatar_seed || null,
            isAnonymous: p.is_anonymous || false,
            isHost: p.is_host || false,
            joinedAt: new Date(p.created_at),
            lastActive: new Date(p.created_at),
          }));
          setParticipants(formatted);
        }
      } catch (err) {
        console.error('Error in fetchParticipants:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParticipants();
  }, [conversationId]);

  return { participants, setParticipants, isLoading };
}
