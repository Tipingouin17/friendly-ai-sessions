
import { useSecureNavigation } from "@/hooks/useSecureNavigation";

export function useNavigateToSession() {
  const { navigateToParticipantSession, navigateToHostSession } = useSecureNavigation();

  const navigateToSession = (
    conversationId: number | null, 
    name: string, 
    participantId: number, 
    avatarSeed: string
  ) => {
    console.log(`Navigating participant to session: ${name}, participantId: ${participantId}`);
    navigateToParticipantSession(conversationId, name, participantId, avatarSeed);
  };

  return { navigateToSession, navigateToHostSession };
}
