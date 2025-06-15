
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ParticipantInfo } from "@/types/chat";

interface UseHostParticipantStateProps {
  locationState: any;
  conversationData: any;
  currentConversationId: number | null;
}

export function useHostParticipantState({
  locationState,
  conversationData,
  currentConversationId
}: UseHostParticipantStateProps) {
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);

  const { data: participantsData, isLoading: isLoadingParticipants } = useQuery({
    queryKey: ['session-participants', currentConversationId],
    queryFn: async () => {
      if (!currentConversationId) return [];
      
      const { data, error } = await supabase
        .from('session_participants')
        .select('*')
        .eq('conversation_id', currentConversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching participants:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!currentConversationId,
    refetchInterval: 5000
  });

  useEffect(() => {
    if (participantsData) {
      const formattedParticipants: ParticipantInfo[] = participantsData.map(p => ({
        id: p.participant_id,
        name: p.name,
        avatarSeed: p.avatar_seed || `participant-${p.participant_id}`,
        isAnonymous: p.is_anonymous || false,
        isHost: p.is_host || false
      }));

      setParticipants(formattedParticipants);
      console.log("Host: Updated participants list:", formattedParticipants.length);
    }
  }, [participantsData]);

  return {
    participants,
    setParticipants,
    isLoadingParticipants
  };
}
