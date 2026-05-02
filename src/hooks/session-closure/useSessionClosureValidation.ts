/**
 * use Session Closure Validation
 *
 * Session closure hook for the AIfacilitator application.
 * Refactored to fetch the conversation row only ONCE (was 3 redundant fetches
 * via validateSessionAccess -> validateSecureSessionOperation -> direct fetch).
 */

import api from "@/lib/api";
import { useSecurityAudit } from '@/hooks/useSecurityAudit';

export const useSessionClosureValidation = () => {
  const { logSecurityViolation } = useSecurityAudit();

  const validateSessionClosure = async (conversationId: number) => {
    if (!conversationId) {
      logSecurityViolation('invalid_session_closure_attempt', { conversationId });
      throw new Error('No conversation ID provided');
    }

    // --- Auth check ---
    const { data: { session } } = await api.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
      logSecurityViolation('unauthenticated_session_closure_attempt', { conversationId });
      throw new Error('User not authenticated');
    }

    // --- Single DB fetch (replaces 3 redundant fetches from the old flow) ---
    const { data: conversation, error: convError } = await api
      .from('conversations')
      .select('user_id, is_session_ended, status')
      .eq('id', conversationId)
      .single();

    if (convError) {
      throw new Error(`Failed to fetch conversation: ${convError.message}`);
    }
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // --- State checks ---
    if (conversation.is_session_ended) {
      throw new Error('Session is already ended');
    }

    // --- Ownership check ---
    if (conversation.user_id !== user.id) {
      logSecurityViolation('unauthorized_session_closure', {
        conversationId,
        userId: user.id,
        ownerId: conversation.user_id,
      });
      throw new Error('Access denied: You do not own this conversation');
    }

    return { user, conversation };
  };

  return { validateSessionClosure };
};
