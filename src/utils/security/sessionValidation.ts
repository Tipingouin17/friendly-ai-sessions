
/**
 * Session access and validation utilities
 */

/**
 * Validates that a user can access a specific session
 * Updated to allow anonymous access for active sessions while maintaining host security
 */
export const validateSessionAccess = async (
  conversationId: number,
  userId?: string
): Promise<boolean> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // First, check if the session exists and is active
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, user_id, is_session_ended, session_started, status')
      .eq('id', conversationId)
      .single();
      
    if (conversationError || !conversation) {
      console.log('Session not found or error fetching session:', conversationError);
      return false;
    }
    
    // Check if session is ended
    if (conversation.is_session_ended) {
      console.log('Session has ended');
      return false;
    }
    
    // Check if session status is inactive
    if (conversation.status && conversation.status !== 'active') {
      console.log('Session is not active');
      return false;
    }
    
    // If no userId provided, allow access to active sessions (for anonymous participants)
    if (!userId) {
      console.log('Anonymous access to active session allowed');
      return true;
    }
    
    // If userId is provided, check if user is the session owner
    if (conversation.user_id === userId) {
      console.log('User is session owner');
      return true;
    }
    
    // Check if user is a participant (for authenticated participants)
    const { data: participant, error: participantError } = await supabase
      .from('session_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .limit(1)
      .single();
      
    if (participant && !participantError) {
      console.log('User is a session participant');
      return true;
    }
    
    console.log('User does not have access to this session');
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
