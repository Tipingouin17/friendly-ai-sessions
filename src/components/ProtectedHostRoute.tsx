
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { Loader2 } from 'lucide-react';

interface ProtectedHostRouteProps {
  children: React.ReactNode;
}

export const ProtectedHostRoute: React.FC<ProtectedHostRouteProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const { logSecurityViolation, logSensitiveAction } = useSecurityAudit();
  const [isHost, setIsHost] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkHostStatus = async () => {
      if (!user || !isAuthenticated) {
        setIsHost(false);
        setIsLoading(false);
        return;
      }

      try {
        // Extract conversation ID from URL params
        const urlParams = new URLSearchParams(location.search);
        const conversationId = urlParams.get('id');

        if (!conversationId) {
          console.error('No conversation ID found in URL');
          setIsHost(false);
          setIsLoading(false);
          return;
        }

        // Check if user is host of this specific session
        const { data, error } = await supabase.rpc('is_session_host', {
          conversation_id: parseInt(conversationId)
        });
        
        if (error) {
          console.error('Error checking host status:', error);
          logSecurityViolation('host_check_failed', { error: error.message });
          setIsHost(false);
        } else {
          setIsHost(data || false);
          
          if (data) {
            // Log successful host access
            logSensitiveAction('host_route_access', location.pathname);
          } else {
            // Log unauthorized access attempt
            logSecurityViolation('unauthorized_host_access', { 
              userId: user.id,
              path: location.pathname,
              conversationId
            });
          }
        }
      } catch (error) {
        console.error('Host check failed:', error);
        logSecurityViolation('host_check_exception', { error: String(error) });
        setIsHost(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkHostStatus();
  }, [user, isAuthenticated, location.pathname, location.search, logSecurityViolation, logSensitiveAction]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Verifying host permissions...</span>
      </div>
    );
  }

  if (!isHost) {
    // Redirect unauthorized users away from host routes
    return <Navigate to="/session" replace />;
  }

  return <>{children}</>;
};
