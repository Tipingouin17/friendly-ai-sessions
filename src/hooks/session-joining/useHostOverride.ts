
import { useToast } from "@/components/ui/use-toast";
import { registerParticipant } from "./useParticipantRegistration";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";
import { sanitizeInput } from "@/utils/inputValidation";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface HostOverrideParams {
  conversationId: number;
  participantName: string;
  avatarSeed: string;
  isAnonymous?: boolean;
}

export function useHostOverride() {
  const { toast } = useToast();
  const { persistParticipantData } = useParticipantPersistence();
  const { user } = useAuth();

  const handleHostOverride = async ({
    conversationId,
    participantName,
    avatarSeed,
    isAnonymous = false
  }: HostOverrideParams) => {
    // Verify host status before allowing override
    if (!user) {
      throw new Error("Authentication required for host override");
    }

    try {
      const { data: isHost, error } = await supabase.rpc('is_session_host', {
        conversation_id: conversationId
      });
      
      if (error || !isHost) {
        throw new Error("Unauthorized: Host privileges required");
      }

      console.log("🔑 Verified host override for session full error");
      
      // For verified hosts, allow them to join with a special participant ID
      const hostParticipantId = Math.floor(Math.random() * 900) + 9000; // Use a very high ID for host override
      
      await registerParticipant({
        conversationId, 
        participantId: hostParticipantId,
        participantName: sanitizeInput(participantName),
        avatarSeed: sanitizeInput(avatarSeed),
        isAnonymous,
        isHost: true // Force host for this registration
      });
      
      // Persist host participant data
      persistParticipantData({
        participantId: hostParticipantId,
        conversationId,
        name: sanitizeInput(participantName),
        avatarSeed: sanitizeInput(avatarSeed),
        isAnonymous,
        isHost: true
      });
      
      toast({
        title: "Host Override",
        description: "Session is full, but you're joining as a host.",
        variant: "default"
      });
      
      return {
        participantId: hostParticipantId,
        name: sanitizeInput(participantName),
        avatarSeed: sanitizeInput(avatarSeed),
        isHost: true,
        isExistingParticipant: false
      };
    } catch (error) {
      console.error('Host override failed:', error);
      throw error;
    }
  };

  return {
    handleHostOverride
  };
}
