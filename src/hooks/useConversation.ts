
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ConversationWithSession } from "@/types/database";
import { getFacilitatorAvatarUrl } from "@/utils/facilitatorUtils";

// Define the fetch conversation function first
const fetchConversation = async (id: number | null) => {
  if (!id) return null;
  
  try {
    // Ensure we also fetch language and participant_description fields
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants,
        participant_description,
        language,
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
      throw new Error(error.message || "Could not load session data");
    }
    
    if (!data) {
      return null;
    }
    
    return data as ConversationWithSession;
  } catch (error) {
    throw error;
  }
};

export const useConversation = (conversationId: number | null) => {
  return useQuery<ConversationWithSession | null, Error>({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      try {
        if (!conversationId) {
          throw new Error("No conversation ID provided");
        }
        
        const data = await fetchConversation(conversationId);
        
        if (!data) {
          throw new Error("Session not found or no longer available");
        }
        
        // Check if session is active
        if (data.status !== 'active' || data.is_session_ended) {
          throw new Error("This session has ended or is no longer available");
        }
        
        // Process facilitator profile picture to ensure it's a complete URL
        if (data.sessions?.facilitator_details) {
          const facilitator = data.sessions.facilitator_details;
          
          // Use the centralized facilitator avatar URL function
          if (facilitator.id) {
            try {
              const avatarUrl = await getFacilitatorAvatarUrl(facilitator);
              facilitator.profile_picture = avatarUrl;
              console.log('Processed facilitator profile picture:', avatarUrl);
            } catch (error) {
              console.error('Error processing facilitator avatar:', error);
              facilitator.profile_picture = '/placeholder.svg';
            }
          }
        }
        
        return data as ConversationWithSession;
      } catch (error) {
        throw error instanceof Error ? error : new Error("Failed to load session");
      }
    },
    enabled: !!conversationId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 3000,
    gcTime: 60000, // Updated from cacheTime to gcTime for React Query v5
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true
  });
};
