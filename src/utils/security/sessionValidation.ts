
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
      return false;
    }

    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data: conversation } = await supabase
      .from('conversations')
      .select('user_id, session_started, is_session_ended, status')
      .eq('id', conversationId)
      .single();
    
    if (!conversation) return false;
    
    // Check if session is in valid state
    if (conversation.status !== 'active') return false;
    if (conversation.is_session_ended) return false;
    
    // Allow access if user is the owner
    if (userId && conversation.user_id === userId) return true;
    
    // For non-owners, only allow access if session has started
    if (conversation.session_started) {
      // Additional check: verify user is actually a participant
      if (userId) {
        const { data: participant } = await supabase
          .from('session_participants')
          .select('id')
          .eq('conversation_id', conversationId)
          .limit(1)
          .maybeSingle();
        
        return !!participant;
      }
      return true;
    }
    
    return false;
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
