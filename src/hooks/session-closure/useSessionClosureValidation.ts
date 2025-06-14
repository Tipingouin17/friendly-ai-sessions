
import { supabase } from '@/integrations/supabase/client';
import { validateSecureSessionOperation } from '@/utils/securityEnhanced';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';

export const useSessionClosureValidation = () => {
  const { logSecurityViolation } = useSecurityAudit();

  const validateSessionClosure = async (conversationId: number) => {
    if (!conversationId) {
      console.error("❌ No conversation ID provided to closeSessionAndGenerateReport");
      logSecurityViolation('invalid_session_closure_attempt', { conversationId });
      throw new Error('No conversation ID provided');
    }

    console.log("🔍 Step 1: Checking user authentication...");
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("❌ User authentication error:", userError);
      throw new Error(`Authentication failed: ${userError.message}`);
    }
    
    if (!user) {
      console.error("❌ No authenticated user found");
      logSecurityViolation('unauthenticated_session_closure_attempt', { conversationId });
      throw new Error('User not authenticated');
    }
    
    console.log("✅ User authenticated:", user.id);

    console.log("🔍 Step 2: Performing security validation...");
    const securityValidation = await validateSecureSessionOperation(
      conversationId, 
      user.id, 
      'close_session'
    );
    
    if (!securityValidation.isValid) {
      console.error("❌ Security validation failed:", securityValidation.error);
      logSecurityViolation('unauthorized_session_closure', { 
        conversationId, 
        userId: user.id,
        error: securityValidation.error 
      });
      throw new Error(securityValidation.error || 'Security validation failed');
    }

    console.log("🔍 Step 3: Verifying conversation ownership...");
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('user_id, is_session_ended')
      .eq('id', conversationId)
      .single();

    if (convError) {
      console.error("❌ Error fetching conversation:", convError);
      throw new Error(`Failed to fetch conversation: ${convError.message}`);
    }

    if (!conversation) {
      console.error("❌ Conversation not found");
      throw new Error('Conversation not found');
    }

    if (conversation.user_id !== user.id) {
      console.error("❌ User does not own this conversation");
      logSecurityViolation('unauthorized_session_access', { 
        conversationId, 
        userId: user.id,
        ownerId: conversation.user_id 
      });
      throw new Error('Access denied: You do not own this conversation');
    }

    if (conversation.is_session_ended) {
      console.error("❌ Session is already ended");
      throw new Error('Session is already ended');
    }

    console.log("✅ Conversation ownership verified");
    return { user, conversation };
  };

  return { validateSessionClosure };
};
