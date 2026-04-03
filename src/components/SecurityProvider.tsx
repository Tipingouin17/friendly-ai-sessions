/**
 * Security Provider
 *
 * Component for the AIfacilitator application.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { validateEnvironmentSecurity } from '@/utils/security/environmentSecurity';

interface SecurityContextType {
  isSecureEnvironment: boolean;
  securityAlerts: string[];
  clearSecurityAlerts: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within a SecurityProvider');
  }
  return context;
};

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSecureEnvironment, setIsSecureEnvironment] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState<string[]>([]);
  const { logSecurityViolation } = useSecurityAudit();

  useEffect(() => {
    // Validate environment security on mount
    try {
      validateEnvironmentSecurity();
      setIsSecureEnvironment(true);
    } catch (error) {
      setIsSecureEnvironment(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown security error';
      setSecurityAlerts([errorMessage]);
      logSecurityViolation('environment_security_check_failed', { error: errorMessage });
    }

    // Monitor for security violations
    const handleSecurityViolation = (event: CustomEvent) => {
      setSecurityAlerts(prev => [...prev, event.detail.message]);
    };

    window.addEventListener('security-violation', handleSecurityViolation as EventListener);
    
    return () => {
      window.removeEventListener('security-violation', handleSecurityViolation as EventListener);
    };
  }, [logSecurityViolation]);

  // NOTE: Removed DevTools detection and right-click logging.
  // These are security theater that annoy legitimate users and developers
  // while providing zero protection against actual threats.
  // Real security should be enforced server-side via RLS policies and auth.

  const clearSecurityAlerts = () => {
    setSecurityAlerts([]);
  };

  const value = {
    isSecureEnvironment,
    securityAlerts,
    clearSecurityAlerts
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};
