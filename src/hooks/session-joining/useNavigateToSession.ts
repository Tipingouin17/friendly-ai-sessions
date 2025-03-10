
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
    
    if (forceAdmin) {
      // Set admin status in session storage to ensure it persists
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
    }
    
    navigate(`/session?id=${conversationId}`, {
      state: { 
        participantName: name,
        avatarSeed,
        isGuest: true,
        participantId,
        showMessaging: true,
        isAdmin: forceAdmin
      }
    });
  };

  return { navigateToSession };
}
