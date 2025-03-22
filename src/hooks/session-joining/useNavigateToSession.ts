
import { useNavigate } from "react-router-dom";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";

export function useNavigateToSession() {
  const navigate = useNavigate();
  const { setAdminStatus } = useSessionAdminStatus();

  const navigateToSession = (
    conversationId: number | null, 
    name: string, 
    participantId: number, 
    avatarSeed: string, 
    forceAdmin: boolean = false
  ) => {
    console.log(`Navigating to session with name: ${name}, participantId: ${participantId}, isAdmin: ${forceAdmin}`);
    
    // Choose the appropriate path based on admin status
    const sessionPath = forceAdmin ? `/session/admin` : `/session`;
    
    if (forceAdmin) {
      // Set admin status in session storage to ensure it persists
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
    }
    
    navigate(`${sessionPath}?id=${conversationId}`, {
      state: { 
        participantName: name,
        avatarSeed,
        isGuest: !forceAdmin,
        participantId,
        showMessaging: true,
        isAdmin: forceAdmin,
        conversationId: conversationId
      }
    });
  };
  
  const navigateToAdminSession = (conversationId: number | null) => {
    if (!conversationId) {
      console.error("Cannot navigate to admin session without conversation ID");
      return;
    }
    
    console.log(`Navigating to admin session for conversation: ${conversationId}`);
    
    // Set admin status
    sessionStorage.setItem('isAdminSession', 'true');
    setAdminStatus(true);
    
    // Navigate to admin session path
    navigate(`/session/admin?id=${conversationId}`, {
      state: {
        isAdmin: true,
        showMessaging: true,
        conversationId: conversationId
      }
    });
  };

  return { navigateToSession, navigateToAdminSession };
}
