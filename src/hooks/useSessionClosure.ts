
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateSecureSessionOperation } from '@/utils/securityEnhanced';
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

export const useSessionClosure = () => {
  const [isClosing, setIsClosing] = useState(false);
  const [closureResult, setClosureResult] = useState<SessionClosureResult | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logSensitiveAction, logSecurityViolation } = useSecurityAudit();

  const closeSessionAndGenerateReport = async (conversationId: number) => {
    if (!conversationId) {
      console.error("❌ No conversation ID provided to closeSessionAndGenerateReport");
      logSecurityViolation('invalid_session_closure_attempt', { conversationId });
      toast({
        title: "Error",
        description: "No conversation ID provided",
        variant: "destructive"
      });
      return false;
    }

    setIsClosing(true);
    console.log("🚀 Starting session closure process for conversation:", conversationId);

    try {
      // Step 1: Verify user authentication
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

      // Step 2: Enhanced security validation
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

      // Step 3: Verify conversation ownership
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

      // Log the sensitive action
      logSensitiveAction('session_closure_initiated', conversationId);

      // Step 4: Call the edge function
      console.log("🔍 Step 4: Calling edge function to close session and generate report...");
      
      const { data, error } = await supabase.functions.invoke('close-session-and-generate-report', {
        body: {
          conversationId,
          userId: user.id
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
      setClosureResult(data);

      // Log successful closure
      logSensitiveAction('session_closure_completed', conversationId);

      // Step 5: Invalidate relevant queries to ensure real-time sync
      console.log("🔄 Invalidating queries for real-time sync...");
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-workshops'] });
      queryClient.invalidateQueries({ queryKey: ['past-workshops'] });

      toast({
        title: "Session Closed Successfully",
        description: `Report generated with ${data.sessionData.messageCount} messages from ${data.sessionData.participantCount} participants`,
      });

      return true;
    } catch (error) {
      console.error('💥 Error in closeSessionAndGenerateReport:', error);
      
      let errorMessage = "Failed to close session and generate report";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Log the failure
      logSecurityViolation('session_closure_failed', { 
        conversationId, 
        error: errorMessage 
      });
      
      toast({
        title: "Error Closing Session",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsClosing(false);
    }
  };

  const downloadReport = (format: 'json' | 'text' = 'text') => {
    if (!closureResult) {
      toast({
        title: "No Report Available",
        description: "Please close a session first to generate a report",
        variant: "destructive"
      });
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `session-report-${timestamp}`;

    if (format === 'json') {
      const dataStr = JSON.stringify(closureResult, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `${filename}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } else {
      const dataStr = closureResult.reportContent;
      const dataUri = 'data:text/plain;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `${filename}.txt`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }

    toast({
      title: "Report Downloaded",
      description: `Session report downloaded as ${format.toUpperCase()} file`,
    });
  };

  return {
    isClosing,
    closureResult,
    closeSessionAndGenerateReport,
    downloadReport
  };
};
