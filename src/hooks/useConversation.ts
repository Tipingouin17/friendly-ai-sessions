
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ConversationWithSession } from "@/types/database";
import { getFacilitatorAvatarUrl } from "@/utils/facilitatorUtils";

// Define the fetch conversation function with enhanced facilitator joins
const fetchConversation = async (id: number | null) => {
  if (!id) return null;
  
  try {
    
    // Enhanced query with proper facilitator joins through sessions table
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
          session_type,
          facilitator,
          facilitator_details:facilitators!sessions_facilitator_fkey (
            id,
            title,
            profile_picture,
            details,
            description,
            expertise_level,
            specialties,
            languages
          )
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching conversation:', error);
      throw new Error(error.message || "Could not load session data");
    }
    
    if (!data) {
      console.warn('⚠️ No conversation data found for ID:', id);
      return null;
    }

    return data as ConversationWithSession;
  } catch (error) {
    console.error('💥 Exception in fetchConversation:', error);
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
        
        // Note: We return data even for completed sessions
        // Let consuming components decide how to handle completed sessions
        
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
                
              } catch (error) {
                console.error('❌ Error processing facilitator avatar:', error);
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
    staleTime: 0, // Always refetch fresh data (joins must be current)
    gcTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchInterval: (queryData) => {
      // Only poll every 30 seconds for active admin sessions
      const isAdmin = sessionStorage.getItem('isAdminSession') === 'true';
      
      if (queryData && queryData.state && queryData.state.data) {
        const conversationData = queryData.state.data;
        
        if (conversationData) {
          const isActive = conversationData.status === 'active' && !conversationData.is_session_ended;
          
          if (isAdmin && isActive) {
            return 30000; // 30 seconds for active admin sessions
          } else if (isActive) {
            return 60000; // 1 minute for active non-admin sessions
          }
        }
      }
      return false; // Don't poll for inactive sessions or if data is null
    }
  });
};
