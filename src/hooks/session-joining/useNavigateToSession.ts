/**
 * use Navigate To Session
 *
 * Session joining hook for the AIfacilitator application.
 */
import { useSecureNavigation } from "@/hooks/useSecureNavigation";

export function useNavigateToSession() {
  const { navigateToParticipantSession, navigateToHostSession } = useSecureNavigation();

  // This hook is now deprecated in favor of handling navigation in the component
  // We keep it for backward compatibility but recommend using Navigate component instead
  const navigateToSession = (
    conversationId: number | null, 
    name: string, 
    participantId: number, 
    avatarSeed: string
  ) => {
    navigateToParticipantSession(conversationId, name, participantId, avatarSeed);
  };

  return { navigateToSession, navigateToHostSession };
}
