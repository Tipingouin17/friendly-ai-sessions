
import { supabase } from '@/integrations/supabase/client';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';

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

  const executeSessionClosure = async (
    conversationId: number,
    userId: string
  ): Promise<SessionClosureResult> => {
    console.log("🚀 Starting session closure process for conversation:", conversationId);

    // Log the sensitive action
    logSensitiveAction('session_closure_initiated', conversationId);

    console.log("🔍 Step 4: Calling edge function to close session and generate report...");
    
    const { data, error } = await supabase.functions.invoke('close-session-and-generate-report', {
      body: {
        conversationId,
        userId
      }
    });

    console.log("📡 Edge function response received:", { data, error });

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

    console.log("✅ Session closed successfully:", data);
    
    // Log successful closure
    logSensitiveAction('session_closure_completed', conversationId);

    return data;
  };

  return { executeSessionClosure };
};
