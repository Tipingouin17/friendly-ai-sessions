
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

    // Validate conversation ID
    if (!conversationId || !Number.isInteger(conversationId) || conversationId <= 0) {
      console.error("Invalid conversation ID:", conversationId);
      return false;
    }

    const { supabase } = await import('@/integrations/supabase/client');

    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('user_id, session_started, is_session_ended, status')
      .eq('id', conversationId)
      .single();

    if (fetchError) {
      console.error("Error fetching conversation:", fetchError);
      return false;
    }

    if (!conversation) {
      console.error("Conversation not found");
      return false;
    }

    // Check if session is in valid state
    if (conversation.status !== 'active') {
      console.error("Session status is not active:", conversation.status);
      return false;
    }

    if (conversation.is_session_ended) {
      console.error("Session has ended");
      return false;
    }

    // Allow access if user is the owner
    if (userId && conversation.user_id === userId) {
      return true;
    }

    // FIXED: Allow participants to join even if session hasn't started yet
    // They will be in a waiting state until the host starts the session
    // Only requirement is that the session is active and not ended
    return true;

  } catch (error) {
    console.error('Error validating session access:', error);
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
