
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ConversationWithSession } from "@/types/database";

export const useConversation = (conversationId: number | null) => {
  return useQuery<ConversationWithSession | null>({
    queryKey: ['conversation', conversationId],
    queryFn: () => fetchConversation(conversationId),
    enabled: !!conversationId,
  });
};

const fetchConversation = async (id: number | null) => {
  if (!id) return null;
  
  console.log('Fetching conversation with ID:', id);
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      sessions!conversations_sessions_id_fkey (
        id,
        title,
        objective,
        welcome_message,
        facilitator,
        facilitator_details:facilitators (
          id,
          title,
          profile_picture,
          details
        )
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching conversation:', error);
    throw error;
  }
  console.log('Fetched conversation:', data);
  return data;
};
