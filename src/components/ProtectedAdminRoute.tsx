
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { Loader2 } from 'lucide-react';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const { logSecurityViolation, logSensitiveAction } = useSecurityAudit();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user || !isAuthenticated) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        // Check if user has admin role using the updated system admin function
        const { data, error } = await supabase.rpc('is_system_admin');
        
        if (error) {
          console.error('Error checking admin status:', error);
          logSecurityViolation('admin_check_failed', { error: error.message });
          setIsAdmin(false);
        } else {
          setIsAdmin(data || false);
          
          if (data) {
            // Log successful admin access
            logSensitiveAction('admin_route_access', location.pathname);
          } else {
            // Log unauthorized access attempt
            logSecurityViolation('unauthorized_admin_access', { 
              userId: user.id,
              path: location.pathname 
            });
          }
        }
      } catch (error) {
        console.error('Admin check failed:', error);
        logSecurityViolation('admin_check_exception', { error: String(error) });
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, isAuthenticated, location.pathname, logSecurityViolation, logSensitiveAction]);

  // Clear any dangerous session storage flags
  useEffect(() => {
    try {
      sessionStorage.removeItem('isAdminSession');
      localStorage.removeItem('isAdminSession');
    } catch (error) {
      console.error('Error clearing admin session flags:', error);
    }
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Verifying admin permissions...</span>
      </div>
    );
  }

  if (!isAdmin) {
    // Redirect unauthorized users away from admin routes
    return <Navigate to="/session" replace />;
  }

  return <>{children}</>;
};
