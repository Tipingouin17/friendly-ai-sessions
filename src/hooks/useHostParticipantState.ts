
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

  console.log("🔍 useHostParticipantState - Starting with conversationId:", currentConversationId);

  const { data: participantsData, isLoading: isLoadingParticipants } = useQuery({
    queryKey: ['session-participants', currentConversationId],
    queryFn: async () => {
      if (!currentConversationId) {
        console.log("🔍 useHostParticipantState - No conversationId, returning empty array");
        return [];
      }
      
      console.log("🔍 useHostParticipantState - Fetching participants for conversation:", currentConversationId);
      
      const { data, error } = await supabase
        .from('session_participants')
        .select('*')
        .eq('conversation_id', currentConversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("🔍 useHostParticipantState - Error fetching participants:", error);
        return [];
      }

      console.log("🔍 useHostParticipantState - Raw data from database:", data);
      return data || [];
    },
    enabled: !!currentConversationId,
    refetchInterval: 5000
  });

  useEffect(() => {
    if (participantsData) {
      console.log("🔍 useHostParticipantState - Processing participants data:", participantsData);
      
      const formattedParticipants: ParticipantInfo[] = participantsData.map(p => ({
        id: p.participant_id,
        name: p.name,
        avatarSeed: p.avatar_seed || `participant-${p.participant_id}`,
        isAnonymous: p.is_anonymous || false,
        isHost: p.is_host || false
      }));

      console.log("🔍 useHostParticipantState - Formatted participants:", formattedParticipants);
      console.log("🔍 useHostParticipantState - Setting participants count to:", formattedParticipants.length);
      
      setParticipants(formattedParticipants);
    }
  }, [participantsData]);

  console.log("🔍 useHostParticipantState - Current state:", {
    participantsCount: participants.length,
    isLoadingParticipants,
    conversationId: currentConversationId
  });

  return {
    participants,
    setParticipants,
    isLoadingParticipants
  };
}
