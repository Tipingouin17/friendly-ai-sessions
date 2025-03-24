
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

// Cache for processed avatar URLs to prevent redundant processing
const facilitatorAvatarCache = new Map<number, { url: string, timestamp: number }>();
const AVATAR_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

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
          
          // Use cached avatar URL if available and not expired
          if (facilitator.id) {
            const cachedAvatar = facilitatorAvatarCache.get(facilitator.id);
            const now = Date.now();
            
            if (cachedAvatar && (now - cachedAvatar.timestamp) < AVATAR_CACHE_TTL) {
              // Use cached avatar URL
              facilitator.profile_picture = cachedAvatar.url;
              console.log('Using cached facilitator profile picture:', cachedAvatar.url);
            } else {
              // Process and cache the new avatar URL
              try {
                const avatarUrl = await getFacilitatorAvatarUrl(facilitator);
                facilitator.profile_picture = avatarUrl;
                
                // Cache the processed URL
                facilitatorAvatarCache.set(facilitator.id, {
                  url: avatarUrl,
                  timestamp: now
                });
                
                console.log('Processed and cached facilitator profile picture:', avatarUrl);
              } catch (error) {
                console.error('Error processing facilitator avatar:', error);
                facilitator.profile_picture = '/placeholder.svg';
              }
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
    staleTime: 30000, // Increase from 3000ms to 30000ms (30 seconds) to reduce refresh frequency
    gcTime: 300000, // Increase from 60000ms to 300000ms (5 minutes)
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: (data) => {
      // Only poll every 30 seconds for active admin sessions
      const isAdmin = sessionStorage.getItem('isAdminSession') === 'true';
      
      // Fix: Access status and is_session_ended from data, not from the query object
      const isActive = data?.status === 'active' && !data?.is_session_ended;
      
      if (isAdmin && isActive) {
        return 30000; // 30 seconds for active admin sessions
      } else if (isActive) {
        return 60000; // 1 minute for active non-admin sessions
      }
      return false; // Don't poll for inactive sessions
    }
  });
};
