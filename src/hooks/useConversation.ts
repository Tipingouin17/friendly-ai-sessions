
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useConversation = (conversationId: number | null) => {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) throw new Error('Conversation ID is required');
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          sessions:sessions_id (
            id,
            title,
            objective,
            welcome_message,
            facilitator (
              id,
              title,
              profile_picture,
              details
            )
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId
  });
};
