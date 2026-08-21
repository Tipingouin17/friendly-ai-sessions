/**
 * use Conversation
 *
 * Hook for the AIfacilitator application.
 */

import { useQuery } from "@tanstack/react-query";
import { createLogger } from '@/utils/debugLogger';

const log = createLogger('useConversation', 'conversation');
import api from "@/lib/api";
import { ConversationWithSession } from "@/types/database";
import { getFacilitatorAvatarUrl } from "@/utils/facilitatorUtils";

// Define the fetch conversation function with enhanced facilitator joins
const fetchConversation = async (id: number | null) => {
  if (!id) return null;
  
  try {
    
    // Enhanced query with proper facilitator joins through sessions table
    const { data, error } = await api
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
            languages,
            persona_config:facilitator_persona_configs (
              id,
              facilitator_id,
              display_name,
              pronouns,
              gender_presentation,
              voice_id,
              voice_provider,
              voice_style,
              avatar_style,
              avatar_asset_url,
              locale,
              tone,
              animation_preset,
              nonverbal_behavior,
              speaking_behavior,
              metadata,
              created_at,
              updated_at
            )
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
          console.warn('⚠️ No conversation data found for ID:', id);
          // Return null — the queryFn will convert this to a descriptive error.
          return null;
        }

    return data as ConversationWithSession;
  } catch (error) {
    console.error('Exception in fetchConversation:', error);
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
      log.log(`fetching conversation id=${conversationId}`);
      try {
        if (!conversationId) {
          throw new Error("No conversation ID provided");
        }
        
        const data = await fetchConversation(conversationId);
        
        if (!data) {
          // This can happen when:
          //  1. The join token is missing from the URL (QR code without token)
          //  2. The session ID is invalid
          //  3. A transient network/auth issue
          // Use a message that does NOT contain 'no longer available' to avoid
          // the JoinSessionErrorState falsely classifying this as 'session ended'.
          throw new Error("Session not found. Please use the join link provided by the host.");
        }
        
        // Note: We return data even for completed sessions
        // Let consuming components decide how to handle completed sessions
        
        // Process facilitator profile picture synchronously — do NOT await any
        // network call here.  Awaiting getFacilitatorAvatarUrl() blocks the entire
        // query resolution and keeps the join page in skeleton state for 1-3 extra
        // seconds on every load.  Instead:
        //   1. If the picture is already a full URL or public path, use it as-is.
        //   2. If it's a plain filename (e.g. "52.jpg"), build the Railway storage
        //      public URL directly — no network round-trip needed.
        //   3. If the cached URL is still fresh, use it.
        // The <img> element on the join page will handle progressive loading.
        if (data.sessions?.facilitator_details) {
          const facilitator = data.sessions.facilitator_details;
          
          if (facilitator.id) {
            const cachedAvatar = facilitatorAvatarCache.get(facilitator.id);
            const now = Date.now();
            
            if (cachedAvatar && (now - cachedAvatar.timestamp) < AVATAR_CACHE_TTL) {
              // Use cached avatar URL — no network call
              facilitator.profile_picture = cachedAvatar.url;
            } else {
              const pic = facilitator.profile_picture;
              let resolvedUrl: string;

              if (pic && (pic.startsWith('http://') || pic.startsWith('https://') || pic.startsWith('/'))) {
                // Already a usable URL — use directly
                resolvedUrl = pic;
              } else if (pic) {
                // Plain filename stored in DB (e.g. "52.jpg") — build the public
                // Railway storage URL synchronously without a network call.
                const apiUrl = (import.meta.env.VITE_API_URL as string) || '';
                resolvedUrl = `${apiUrl}/storage/v1/object/public/facilitator-avatars/${pic}`;
              } else {
                // No picture — try the conventional {id}.jpg filename
                const apiUrl = (import.meta.env.VITE_API_URL as string) || '';
                resolvedUrl = `${apiUrl}/storage/v1/object/public/facilitator-avatars/${facilitator.id}.jpg`;
              }

              facilitator.profile_picture = resolvedUrl;
              facilitatorAvatarCache.set(facilitator.id, { url: resolvedUrl, timestamp: now });
            }
          }
        }
        
        return data as ConversationWithSession;
      } catch (error) {
        throw error instanceof Error ? error : new Error("Failed to load session");
      }
    },
    enabled: !!conversationId,
    // The invite screen is a user-facing critical path. One quick retry covers
    // transient mobile handoffs without leaving Android on a skeleton for the
    // 20-second watchdog after a saturated backend has already responded.
    retry: 1,
    retryDelay: 1_000,
    // 30 s staleTime: conversation data is stable during an active session.
    // useSessionStatus already calls refetch() on every WebSocket UPDATE event
    // (session_started, is_session_ended, status changes) and falls back to
    // 5 s polling when WebSocket is unavailable.  Duplicating that with a
    // refetchInterval here causes unnecessary network traffic and re-renders.
    staleTime: 30_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // refetch only when data is stale (> 30 s old)
    refetchOnReconnect: true,
  });
};
