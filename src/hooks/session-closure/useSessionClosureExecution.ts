
import { supabase } from '@/integrations/supabase/client';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

interface SessionClosureResult {
  reportId: string;
  reportContent: string;
  sessionData: {
    participantCount: number;
    messageCount: number;
    duration: number;
    engagementScore: number;
  };
}

export const useSessionClosureExecution = () => {
  const { logSensitiveAction, logSecurityViolation } = useSecurityAudit();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const executeSessionClosure = async (
    conversationId: number,
    userId: string
  ): Promise<SessionClosureResult> => {

    // Log the sensitive action
    logSensitiveAction('session_closure_initiated', conversationId);

    const { data, error } = await supabase.functions.invoke('close-session-and-generate-report', {
      body: {
        conversationId,
        userId
      }
    });

    if (error) {
      console.error("❌ Edge function error:", error);
      logSecurityViolation('edge_function_failure', { 
        conversationId, 
        error: error.message 
      });
      throw new Error(`Edge function failed: ${error.message || 'Unknown error'}`);
    }

    if (!data || !data.success) {
      console.error("❌ Edge function returned unsuccessful result:", data);
      throw new Error(data?.error || 'Failed to process session closure');
    }

    // Log successful closure
    logSensitiveAction('session_closure_completed', conversationId);

    // Immediately invalidate all relevant queries
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] }),
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] }),
      queryClient.invalidateQueries({ queryKey: ['active-workshops'] }),
      queryClient.invalidateQueries({ queryKey: ['past-workshops'] }),
      queryClient.invalidateQueries({ queryKey: ['session-participants', conversationId] })
    ]);

    // Navigate away immediately to prevent UI confusion
    navigate('/past-workshops', { replace: true });

    return data;
  };

  return { executeSessionClosure };
};
