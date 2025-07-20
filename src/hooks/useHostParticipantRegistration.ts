
import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { registerParticipant } from '@/hooks/session-joining/useParticipantRegistration';
import { useParticipantPersistence } from '@/hooks/useParticipantPersistence';
import { sanitizeInput } from '@/utils/inputValidation';

interface HostParticipantRegistrationParams {
  conversationId: number;
  hostName?: string;
}

export function useHostParticipantRegistration({
  conversationId,
  hostName = "Host"
}: HostParticipantRegistrationParams) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [hostParticipantId, setHostParticipantId] = useState<number | null>(null);
  const { toast } = useToast();
  const { persistParticipantData } = useParticipantPersistence();

  const registerHostAsParticipant = useCallback(async () => {
    if (isRegistering || hostParticipantId) return hostParticipantId;

    setIsRegistering(true);
    
    try {
      // Generate a unique participant ID for the host (using 1 as default for host)
      const participantId = 1;
      const avatarSeed = `host-${conversationId}`;
      
      console.log("🔧 Registering host as participant:", {
        conversationId,
        participantId,
        hostName,
        avatarSeed
      });

      await registerParticipant({
        conversationId,
        participantId,
        participantName: sanitizeInput(hostName),
        avatarSeed: sanitizeInput(avatarSeed),
        isAnonymous: false,
        isHost: true
      });

      // Persist host participant data
      persistParticipantData({
        participantId,
        conversationId,
        name: sanitizeInput(hostName),
        avatarSeed: sanitizeInput(avatarSeed),
        isAnonymous: false,
        isHost: true
      });

      setHostParticipantId(participantId);
      
      console.log("✅ Host registered as participant:", participantId);
      
      return participantId;
    } catch (error) {
      console.error("❌ Failed to register host as participant:", error);
      toast({
        title: "Registration Error",
        description: "Failed to register as participant. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsRegistering(false);
    }
  }, [conversationId, hostName, isRegistering, hostParticipantId, toast, persistParticipantData]);

  return {
    registerHostAsParticipant,
    hostParticipantId,
    isRegistering
  };
}
