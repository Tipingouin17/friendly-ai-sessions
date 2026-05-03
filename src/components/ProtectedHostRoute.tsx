/**
 * Protected Host Route
 *
 * Component for the AIfacilitator application.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from "@/lib/api";
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { Loader2 } from 'lucide-react';

interface ProtectedHostRouteProps {
  children: React.ReactNode;
}

export const ProtectedHostRoute: React.FC<ProtectedHostRouteProps> = ({ children }) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();
  const { logSecurityViolation, logSensitiveAction } = useSecurityAudit();
  const [isHost, setIsHost] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use refs so the effect never re-runs just because a logging callback
  // reference changed — same pattern as AuthContext.
  const logSecurityViolationRef = useRef(logSecurityViolation);
  const logSensitiveActionRef = useRef(logSensitiveAction);
  useEffect(() => { logSecurityViolationRef.current = logSecurityViolation; }, [logSecurityViolation]);
  useEffect(() => { logSensitiveActionRef.current = logSensitiveAction; }, [logSensitiveAction]);

  useEffect(() => {
    const checkHostStatus = async () => {
      // Wait for auth to finish loading first
      if (authLoading) {
        return;
      }

      // If not authenticated after auth loading is complete, set loading to false
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
        const { data, error } = await api.rpc('is_session_host', {
          conversation_id: parseInt(conversationId)
        });
        
        if (error) {
          console.error('Error checking host status:', error);
          logSecurityViolationRef.current('host_check_failed', { error: error.message });
          setIsHost(false);
        } else {
          setIsHost(data || false);
          
          if (data) {
            // Log successful host access
            logSensitiveActionRef.current('host_route_access', location.pathname);
          } else {
            // Log unauthorized access attempt
            logSecurityViolationRef.current('unauthorized_host_access', { 
              userId: user.id,
              path: location.pathname,
              conversationId
            });
          }
        }
      } catch (error) {
        console.error('Host check failed:', error);
        logSecurityViolationRef.current('host_check_exception', { error: String(error) });
        setIsHost(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkHostStatus();
    // logSecurityViolation and logSensitiveAction are accessed via refs — exclude
    // them from the dependency array to prevent infinite re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthenticated, authLoading, location.pathname, location.search]);

  // Show a single unified loading screen that covers both the auth check
  // ("Verifying access") and the subsequent session initialisation phase.
  // The Host never sees two separate loading states.
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your session...</p>
        </div>
      </div>
    );
  }

  // Only redirect to login if auth has finished loading and user is not authenticated
  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Only redirect away from host routes if we've confirmed user is not a host
  if (!isLoading && !isHost) {
    // Redirect unauthorized users away from host routes
    return <Navigate to="/session" replace />;
  }

  return <>{children}</>;
};
