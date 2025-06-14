
import { useSecureNavigation } from "@/hooks/useSecureNavigation";

export function useNavigateToSession() {
  const { navigateToParticipantSession, navigateToAdminSession } = useSecureNavigation();

  // Remove the dangerous forceAdmin parameter entirely
  const navigateToSession = (
    conversationId: number | null, 
    name: string, 
    participantId: number, 
    avatarSeed: string
  ) => {
    console.log(`Navigating participant to session: ${name}, participantId: ${participantId}`);
    navigateToParticipantSession(conversationId, name, participantId, avatarSeed);
  };

  return { navigateToSession, navigateToAdminSession };
}
