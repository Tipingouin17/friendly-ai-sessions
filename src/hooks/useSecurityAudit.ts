/**
 * use Security Audit
 *
 * Hook for the AIfacilitator application.
 */
import { useCallback } from 'react';
import api from "@/lib/api";
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  eventType: string;
  eventDetails?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export const useSecurityAudit = () => {
  const { toast } = useToast();

  const logSecurityEvent = useCallback(async (event: SecurityEvent) => {
    try {
      const { data: { session } } = await api.auth.getSession();
      const user = session?.user ?? null;

      const { error } = await api
        .from('security_audit_log')
        .insert({
          user_id: user?.id || null,
          event_type: event.eventType,
          event_details: event.eventDetails || { /* no-op */ },
          ip_address: event.ipAddress,
          user_agent: event.userAgent || navigator.userAgent
        });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Security audit logging failed:', error);
    }
  }, []);

  const logAuthAttempt = useCallback((success: boolean, method: string) => {
    logSecurityEvent({
      eventType: success ? 'auth_success' : 'auth_failure',
      eventDetails: { method, timestamp: new Date().toISOString() }
    });
  }, [logSecurityEvent]);

  const logSensitiveAction = useCallback((action: string, resourceId?: string | number) => {
    logSecurityEvent({
      eventType: 'sensitive_action',
      eventDetails: {
        action,
        resourceId: resourceId?.toString(),
        timestamp: new Date().toISOString()
      }
    });
  }, [logSecurityEvent]);

  const logSecurityViolation = useCallback((violation: string, details?: Record<string, any>) => {
    logSecurityEvent({
      eventType: 'security_violation',
      eventDetails: { violation, ...details, timestamp: new Date().toISOString() }
    });

    toast({
      title: "Security Alert",
      description: "Suspicious activity detected and logged.",
      variant: "destructive"
    });
  }, [logSecurityEvent, toast]);

  return {
    logSecurityEvent,
    logAuthAttempt,
    logSensitiveAction,
    logSecurityViolation
  };
};
