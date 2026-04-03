/**
 * use Secure Navigation
 *
 * Hook for the AIfacilitator application.
 */

import { useNavigate } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';

export function useSecureNavigation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { logSecurityViolation, logSensitiveAction } = useSecurityAudit();

  const navigateToParticipantSession = (
    conversationId: number | null, 
    name: string, 
    participantId: number, 
    avatarSeed: string
  ) => {
    
    // Clear any admin session flags to prevent security issues
    try {
      sessionStorage.removeItem('isAdminSession');
      localStorage.removeItem('isAdminSession');
    } catch (error) {
      console.error('Error clearing admin flags:', error);
    }
    
    navigate(`/session?id=${conversationId}`, {
      state: { 
        participantName: name,
        avatarSeed,
        isGuest: true,
        participantId,
        showMessaging: true,
        isAdmin: false, // Explicitly set to false for participants
        conversationId: conversationId
      }
    });
  };
  
  const navigateToAdminSession = async (conversationId: number | null) => {
    if (!conversationId) {
      console.error("Cannot navigate to admin session without conversation ID");
      return;
    }
    
    if (!user) {
      console.error("Cannot access admin session without authentication");
      navigate('/login');
      return;
    }

    try {
      // Verify admin status before navigation using the updated function
      const { data: isAdmin, error } = await supabase.rpc('is_system_admin');
      
      if (error || !isAdmin) {
        logSecurityViolation('unauthorized_admin_navigation_attempt', { 
          userId: user.id,
          conversationId 
        });
        console.error("Unauthorized admin access attempt");
        navigate('/session');
        return;
      }

      logSensitiveAction('admin_session_navigation', String(conversationId));
      
      // Navigate to admin session path - ProtectedAdminRoute will handle final security check
      navigate(`/session/admin?id=${conversationId}`, {
        state: {
          isAdmin: true,
          showMessaging: true,
          conversationId: conversationId
        }
      });
    } catch (error) {
      console.error('Error during admin navigation:', error);
      logSecurityViolation('admin_navigation_error', { error: String(error) });
      navigate('/session');
    }
  };

  const navigateToHostSession = async (conversationId: number | null) => {
    if (!conversationId) {
      console.error("Cannot navigate to host session without conversation ID");
      return;
    }
    
    if (!user) {
      console.error("Cannot access host session without authentication");
      navigate('/login');
      return;
    }

    try {
      // Verify host status before navigation
      const { data: isHost, error } = await supabase.rpc('is_session_host', {
        conversation_id: conversationId
      });
      
      if (error || !isHost) {
        logSecurityViolation('unauthorized_host_navigation_attempt', { 
          userId: user.id,
          conversationId 
        });
        console.error("Unauthorized host access attempt");
        navigate('/session');
        return;
      }

      logSensitiveAction('host_session_navigation', String(conversationId));
      
      // Navigate to host session path
      navigate(`/session/host?id=${conversationId}`, {
        state: {
          isHost: true,
          showMessaging: true,
          conversationId: conversationId
        }
      });
    } catch (error) {
      console.error('Error during host navigation:', error);
      logSecurityViolation('host_navigation_error', { error: String(error) });
      navigate('/session');
    }
  };

  return { navigateToParticipantSession, navigateToAdminSession, navigateToHostSession };
}
