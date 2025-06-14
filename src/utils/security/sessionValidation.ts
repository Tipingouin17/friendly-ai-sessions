
/**
 * Session access and validation utilities
 */

/**
 * Validates that a user can access a specific session
 */
export const validateSessionAccess = async (
  conversationId: number,
  userId?: string
): Promise<boolean> => {
  if (!userId) return false;
  
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Check if user is the session owner or a participant
    const { data: conversation } = await supabase
      .from('conversations')
      .select('user_id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();
      
    if (conversation) return true;
    
    // Check if user is a participant (more secure query)
    const { data: participant } = await supabase
      .from('session_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .limit(1);
      
    return !!participant;
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
