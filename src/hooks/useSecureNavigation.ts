
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
    console.log(`Secure navigation to participant session: ${name}, participantId: ${participantId}`);
    
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
      // Verify admin status before navigation
      const { data: isAdmin, error } = await supabase.rpc('is_user_admin', { user_id: user.id });
      
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
      console.log(`Secure navigation to admin session for conversation: ${conversationId}`);
      
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

  return { navigateToParticipantSession, navigateToAdminSession };
}
