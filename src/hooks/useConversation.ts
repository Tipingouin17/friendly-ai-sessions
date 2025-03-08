
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ConversationWithSession } from "@/types/database";

export const useConversation = (conversationId: number | null) => {
  return useQuery<ConversationWithSession | null, Error>({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      try {
        if (!conversationId) {
          throw new Error("No conversation ID provided");
        }
        
        console.log('Fetching conversation with ID:', conversationId);
        const data = await fetchConversation(conversationId);
        
        if (!data) {
          throw new Error("Session not found or no longer available");
        }
        
        return data as ConversationWithSession;
      } catch (error) {
        console.error('Error in query function:', error);
        throw error instanceof Error ? error : new Error("Failed to load session");
      }
    },
    enabled: !!conversationId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 10000, // 10 seconds
    refetchOnWindowFocus: true
  });
};

const fetchConversation = async (id: number | null) => {
  if (!id) return null;
  
  console.log('Fetching conversation with ID:', id);
  try {
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
      throw new Error(error.message || "Could not load session data");
    }
    
    if (!data) {
      console.error('No conversation found with ID:', id);
      return null;
    }
    
    console.log('Fetched conversation:', data);
    return data;
  } catch (error) {
    console.error('Exception in fetchConversation:', error);
    throw error;
  }
};
