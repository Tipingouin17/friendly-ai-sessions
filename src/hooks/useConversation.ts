
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ConversationWithSession } from "@/types/database";

export const useConversation = (conversationId: number | null) => {
  return useQuery<ConversationWithSession | null, Error>({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      try {
        if (!conversationId) {
          console.log('No conversation ID provided to useConversation');
          throw new Error("No conversation ID provided");
        }
        
        console.log('Fetching conversation with ID:', conversationId);
        const data = await fetchConversation(conversationId);
        
        if (!data) {
          console.log(`Conversation not found with ID: ${conversationId}`);
          throw new Error("Session not found or no longer available");
        }
        
        // Check if session is active
        if (data.status !== 'active' || data.is_session_ended) {
          console.log(`Session is not active or has ended: ${conversationId}`);
          throw new Error("This session has ended or is no longer available");
        }
        
        console.log('Successfully fetched conversation data:', data);
        return data as ConversationWithSession;
      } catch (error) {
        console.error('Error in query function:', error);
        throw error instanceof Error ? error : new Error("Failed to load session");
      }
    },
    enabled: !!conversationId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 3000,
    gcTime: 60000, // Updated from cacheTime to gcTime for React Query v5
    refetchOnWindowFocus: false, // Disable automatic refetch on window focus to prevent interrupting session flow
    refetchOnMount: true,
    refetchOnReconnect: true
  });
};

const fetchConversation = async (id: number | null) => {
  if (!id) return null;
  
  console.log('Fetching conversation with ID:', id);
  try {
    // Ensure we also fetch participant_description field
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants,
        participant_description,
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
      console.error('Error fetching conversation from Supabase:', error);
      throw new Error(error.message || "Could not load session data");
    }
    
    if (!data) {
      console.error('No conversation found with ID:', id);
      return null;
    }
    
    console.log('Successfully fetched conversation:', data);
    return data as ConversationWithSession;
  } catch (error) {
    console.error('Exception in fetchConversation:', error);
    throw error;
  }
};
