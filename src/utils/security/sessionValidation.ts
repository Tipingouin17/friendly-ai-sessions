
/**
 * Session access and validation utilities
 */

/**
 * Validate user access to a session with enhanced security checks
 */
export const validateSessionAccess = async (
  conversationId: number,
  userId?: string
): Promise<boolean> => {
  try {
    console.log("=== VALIDATE SESSION ACCESS START ===");
    console.log("Validating access for conversation:", conversationId);
    console.log("User ID:", userId || "anonymous");

    // Validate conversation ID
    if (!conversationId || !Number.isInteger(conversationId) || conversationId <= 0) {
      console.error("❌ Invalid conversation ID:", conversationId);
      return false;
    }
    console.log("✅ Conversation ID is valid");

    const { supabase } = await import('@/integrations/supabase/client');

    console.log("Fetching conversation data from database...");
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('user_id, session_started, is_session_ended, status')
      .eq('id', conversationId)
      .single();

    if (fetchError) {
      console.error("❌ Error fetching conversation:", fetchError);
      return false;
    }

    if (!conversation) {
      console.error("❌ Conversation not found");
      return false;
    }

    console.log("✅ Conversation found:", {
      user_id: conversation.user_id,
      session_started: conversation.session_started,
      is_session_ended: conversation.is_session_ended,
      status: conversation.status
    });

    // Check if session is in valid state
    if (conversation.status !== 'active') {
      console.error("❌ Session status is not active:", conversation.status);
      return false;
    }
    console.log("✅ Session status is active");

    if (conversation.is_session_ended) {
      console.error("❌ Session has ended");
      return false;
    }
    console.log("✅ Session has not ended");

    // Allow access if user is the owner
    if (userId && conversation.user_id === userId) {
      console.log("✅ User is session owner - access granted");
      return true;
    }

    // FIXED: Allow participants to join even if session hasn't started yet
    // They will be in a waiting state until the host starts the session
    // Only requirement is that the session is active and not ended
    console.log("✅ Session is active and not ended - allowing participant to join (waiting state)");
    return true;

  } catch (error) {
    console.error('❌ Error validating session access:', error);
    return false;
  }
};

/**
 * Enhanced participant ID validation with security checks
 */
export const validateParticipantId = (participantId: unknown): participantId is number => {
  if (typeof participantId !== 'number') return false;
  if (!Number.isInteger(participantId)) return false;
  if (participantId <= 0 || participantId >= 10000) return false;

  // Additional security: check for suspicious patterns
  const participantStr = participantId.toString();
  if (participantStr.includes('..') || participantStr.includes('/')) {
    return false;
  }

  return true;
};
