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
  const [isSecureEnvironment, setIsSecureEnvironment] = useState(false);
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

  // Monitor for potentially dangerous activities
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Log potential security-related key combinations
      if (event.ctrlKey && event.shiftKey && event.key === 'I') {
        logSecurityViolation('developer_tools_opened', { 
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent 
        });
      }
    };

    const handleRightClick = (event: MouseEvent) => {
      // In production, consider logging right-click events on sensitive areas
      if (process.env.NODE_ENV === 'production') {
        logSecurityViolation('right_click_detected', { 
          target: (event.target as Element)?.tagName,
          timestamp: new Date().toISOString()
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleRightClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleRightClick);
    };
  }, [logSecurityViolation]);

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