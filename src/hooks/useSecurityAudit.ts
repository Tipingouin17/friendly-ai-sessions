
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  eventType: string;
  eventDetails?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export const useSecurityAudit = () => {
  const { toast } = useToast();

  const logSecurityEvent = async (event: SecurityEvent) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('security_audit_log')
        .insert({
          user_id: user?.id || null,
          event_type: event.eventType,
          event_details: event.eventDetails || {},
          ip_address: event.ipAddress,
          user_agent: event.userAgent || navigator.userAgent
        });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Security audit logging failed:', error);
    }
  };

  const logAuthAttempt = (success: boolean, method: string) => {
    logSecurityEvent({
      eventType: success ? 'auth_success' : 'auth_failure',
      eventDetails: { method, timestamp: new Date().toISOString() }
    });
  };

  const logSensitiveAction = (action: string, resourceId?: string | number) => {
    logSecurityEvent({
      eventType: 'sensitive_action',
      eventDetails: { 
        action, 
        resourceId: resourceId?.toString(),
        timestamp: new Date().toISOString() 
      }
    });
  };

  const logSecurityViolation = (violation: string, details?: Record<string, any>) => {
    logSecurityEvent({
      eventType: 'security_violation',
      eventDetails: { violation, ...details, timestamp: new Date().toISOString() }
    });

    toast({
      title: "Security Alert",
      description: "Suspicious activity detected and logged.",
      variant: "destructive"
    });
  };

  return {
    logSecurityEvent,
    logAuthAttempt,
    logSensitiveAction,
    logSecurityViolation
  };
};
