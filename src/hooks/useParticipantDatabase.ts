/**
 * use Participant Database
 *
 * Hook for the AIfacilitator application.
 */

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

    const fetchParticipants = async () => {
      try {
        // First, get all participants from session_participants
        const { data: participantsData, error: participantsError } = await supabase
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

        if (participantsError) {
          console.error('Error fetching participants:', participantsError);
          setIsLoading(false);
          return;
        }

        // Also check messages to find any participants not in the database
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', conversationId)
          .eq('role', 'user');

        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
        }

        // Extract participant IDs from messages
        const messageParticipantIds = new Set<number>();
        if (messagesData) {
          messagesData.forEach(msg => {
            if (msg.content && typeof msg.content === 'object' && 'participant_id' in msg.content) {
              const participantId = msg.content.participant_id as number;
              if (participantId) {
                messageParticipantIds.add(participantId);
              }
            }
          });
        }

        // Get existing participant IDs from database
        const dbParticipantIds = new Set(participantsData?.map(p => p.participant_id) || []);

        // Find missing participants (those who sent messages but aren't in database)
        const missingParticipantIds = Array.from(messageParticipantIds).filter(id => !dbParticipantIds.has(id));

        // Create placeholder entries for missing participants
        const missingParticipants = missingParticipantIds.map(id => ({
          participant_id: id,
          name: `Participant ${id}`,
          avatar_seed: null,
          is_anonymous: false,
          is_host: false,
          created_at: new Date().toISOString()
        }));

        // Combine existing and missing participants
        const allParticipantsData = [...(participantsData || []), ...missingParticipants];

        if (allParticipantsData.length > 0) {
          const formattedParticipants: ParticipantInfo[] = allParticipantsData.map(p => ({
            id: p.participant_id,
            name: p.name || `Participant ${p.participant_id}`,
            avatar: p.avatar_seed ? `/api/avatar?name=${p.avatar_seed}&variant=beam&palette=0` : null,
            avatarSeed: p.avatar_seed || null,
            isAnonymous: p.is_anonymous || false,
            isHost: p.is_host || false,
            joinedAt: new Date(p.created_at),
            lastActive: new Date(p.created_at),
          }));

          setParticipants(formattedParticipants);

          // Insert missing participants into database for future consistency
          if (missingParticipants.length > 0) {
            const { error: insertError } = await supabase
              .from('session_participants')
              .upsert(
                missingParticipants.map(p => ({
                  conversation_id: conversationId,
                  participant_id: p.participant_id,
                  name: p.name,
                  avatar_seed: p.avatar_seed,
                  is_anonymous: p.is_anonymous,
                  is_host: p.is_host
                })),
                { onConflict: 'conversation_id,participant_id', ignoreDuplicates: true }
              );

            if (insertError) {
              console.error('Error upserting missing participants:', insertError);
            } else { /* no-op */ }
          }
        }

        // Update conversation participant count to match actual participants
        if (allParticipantsData.length > 0) {
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ current_participants: allParticipantsData.length })
            .eq('id', conversationId);

          if (updateError) {
            console.error('Error updating participant count:', updateError);
          } else { /* no-op */ }
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
