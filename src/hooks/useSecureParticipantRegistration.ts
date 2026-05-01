/**
 * use Secure Participant Registration
 *
 * Hook for the AIfacilitator application.
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityAudit } from './useSecurityAudit';
import { useSecureSessionValidation } from './useSecureSessionValidation';
import { validateParticipantName } from '@/utils/security/inputValidation';

interface ParticipantRegistrationData {
  name: string;
  conversationId: number;
  participantId: number;
  avatarSeed: string;
  isAnonymous?: boolean;
}

interface RegistrationResult {
  success: boolean;
  error?: string;
  participant?: any;
}

export const useSecureParticipantRegistration = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const { logSecurityViolation, logSensitiveAction } = useSecurityAudit();
  const { validateSessionCapacity, validateParticipantUniqueness } = useSecureSessionValidation();

  const registerParticipant = useCallback(async (
    data: ParticipantRegistrationData
  ): Promise<RegistrationResult> => {
    setIsRegistering(true);
    
    try {
      const { name, conversationId, participantId, avatarSeed, isAnonymous } = data;

      // Validate participant name
      const nameValidation = validateParticipantName(name);
      if (!nameValidation.isValid) {
        logSecurityViolation('invalid_participant_name', { 
          name,
          error: nameValidation.error
        });
        return { success: false, error: nameValidation.error };
      }

      // Validate session capacity
      const capacityResult = await validateSessionCapacity(conversationId);
      if (!capacityResult.isValid) {
        return { success: false, error: capacityResult.error };
      }

      // Validate participant uniqueness
      const uniquenessResult = await validateParticipantUniqueness(conversationId, participantId);
      if (!uniquenessResult.isValid) {
        return { success: false, error: uniquenessResult.error };
      }

      // Validate avatar seed (basic sanitization)
      const sanitizedAvatarSeed = avatarSeed?.replace(/[^a-zA-Z0-9]/g, '') || 'default';

      // Register participant with additional security checks
      const { data: participant, error } = await supabase
        .from('session_participants')
        .insert({
          conversation_id: conversationId,
          participant_id: participantId,
          name: nameValidation.sanitized,
          avatar_seed: sanitizedAvatarSeed,
          is_anonymous: isAnonymous || false,
          is_host: false
        })
        .select()
        .single();

      if (error) {
        logSecurityViolation('participant_registration_failed', {
          error: error.message,
          conversationId,
          participantId
        });
        
        // Check for specific error types
        if (error.message.includes('capacity')) {
          return { success: false, error: 'Session is at maximum capacity' };
        }
        if (error.message.includes('unique')) {
          return { success: false, error: 'You are already registered for this session' };
        }
        
        return { success: false, error: 'Failed to join session. Please try again.' };
      }

      // Log successful registration
      logSensitiveAction('participant_registered', conversationId);

      return { success: true, participant };

    } catch (error) {
      logSecurityViolation('participant_registration_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId: data.conversationId,
        participantId: data.participantId
      });
      
      return { 
        success: false, 
        error: 'An unexpected error occurred during registration' 
      };
    } finally {
      setIsRegistering(false);
    }
  }, [logSecurityViolation, logSensitiveAction, validateSessionCapacity, validateParticipantUniqueness]);

  const removeParticipant = useCallback(async (
    conversationId: number,
    participantId: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Security check: Only allow removal by session owner or the participant themselves
      const { data: conversation } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', conversationId)
        .single();

      if (!conversation) {
        return { success: false, error: 'Session not found' };
      }

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      const isOwner = user && conversation.user_id === user.id;

      if (!isOwner) {
        logSecurityViolation('unauthorized_participant_removal', {
          conversationId,
          participantId,
          userId: user?.id
        });
        return { success: false, error: 'Unauthorized action' };
      }

      const { error } = await supabase
        .from('session_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('participant_id', participantId);

      if (error) {
        logSecurityViolation('participant_removal_failed', {
          error: error.message,
          conversationId,
          participantId
        });
        return { success: false, error: 'Failed to remove participant' };
      }

      logSensitiveAction('participant_removed', conversationId);
      return { success: true };

    } catch (error) {
      logSecurityViolation('participant_removal_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId,
        participantId
      });
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, [logSecurityViolation, logSensitiveAction]);

  return {
    registerParticipant,
    removeParticipant,
    isRegistering
  };
};