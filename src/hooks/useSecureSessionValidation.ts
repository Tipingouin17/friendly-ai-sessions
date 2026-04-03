/**
 * use Secure Session Validation
 *
 * Hook for the AIfacilitator application.
 */
import { useState, useCallback } from 'react';
import { validateSessionAccess, validateParticipantId } from '@/utils/security/sessionValidation';
import { validateConversationId } from '@/utils/security/inputValidation';
import { useSecurityAudit } from './useSecurityAudit';

interface SessionValidationResult {
  isValid: boolean;
  error?: string;
}

export const useSecureSessionValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const { logSecurityViolation } = useSecurityAudit();

  const validateSessionJoin = useCallback(async (
    conversationId: unknown,
    participantId: unknown,
    userId?: string
  ): Promise<SessionValidationResult> => {
    setIsValidating(true);
    
    try {
      // Validate conversation ID
      if (!validateConversationId(conversationId)) {
        logSecurityViolation('invalid_conversation_id', { conversationId });
        return { isValid: false, error: 'Invalid session ID' };
      }

      // Validate participant ID
      if (!validateParticipantId(participantId)) {
        logSecurityViolation('invalid_participant_id', { participantId });
        return { isValid: false, error: 'Invalid participant ID' };
      }

      // Check session access
      const hasAccess = await validateSessionAccess(conversationId, userId);
      if (!hasAccess) {
        logSecurityViolation('unauthorized_session_access', { 
          conversationId, 
          userId,
          participantId 
        });
        return { isValid: false, error: 'Unauthorized access to session' };
      }

      return { isValid: true };
    } catch (error) {
      logSecurityViolation('session_validation_error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId,
        participantId
      });
      return { isValid: false, error: 'Session validation failed' };
    } finally {
      setIsValidating(false);
    }
  }, [logSecurityViolation]);

  const validateSessionCapacity = useCallback(async (
    conversationId: number
  ): Promise<SessionValidationResult> => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: conversation } = await supabase
        .from('conversations')
        .select('current_participants, participants, session_started')
        .eq('id', conversationId)
        .single();

      if (!conversation) {
        return { isValid: false, error: 'Session not found' };
      }

      if (conversation.session_started) {
        return { isValid: false, error: 'Session has already started' };
      }

      if (conversation.current_participants >= conversation.participants) {
        logSecurityViolation('session_capacity_exceeded', { 
          conversationId,
          currentParticipants: conversation.current_participants,
          maxParticipants: conversation.participants
        });
        return { isValid: false, error: 'Session is at maximum capacity' };
      }

      return { isValid: true };
    } catch (error) {
      logSecurityViolation('capacity_validation_error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId
      });
      return { isValid: false, error: 'Capacity validation failed' };
    }
  }, [logSecurityViolation]);

  const validateParticipantUniqueness = useCallback(async (
    conversationId: number,
    participantId: number
  ): Promise<SessionValidationResult> => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: existingParticipant } = await supabase
        .from('session_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('participant_id', participantId)
        .maybeSingle();

      if (existingParticipant) {
        logSecurityViolation('duplicate_participant_registration', { 
          conversationId,
          participantId
        });
        return { isValid: false, error: 'Participant already registered for this session' };
      }

      return { isValid: true };
    } catch (error) {
      logSecurityViolation('uniqueness_validation_error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId,
        participantId
      });
      return { isValid: false, error: 'Uniqueness validation failed' };
    }
  }, [logSecurityViolation]);

  return {
    validateSessionJoin,
    validateSessionCapacity,
    validateParticipantUniqueness,
    isValidating
  };
};