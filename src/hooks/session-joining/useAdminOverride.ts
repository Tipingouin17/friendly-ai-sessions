
import { useToast } from "@/components/ui/use-toast";
import { registerParticipant } from "./useParticipantRegistration";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";
import { sanitizeInput } from "@/utils/inputValidation";

interface AdminOverrideParams {
  conversationId: number;
  participantName: string;
  avatarSeed: string;
  isAnonymous?: boolean;
}

export function useAdminOverride() {
  const { toast } = useToast();
  const { persistParticipantData } = useParticipantPersistence();

  const handleAdminOverride = async ({
    conversationId,
    participantName,
    avatarSeed,
    isAnonymous = false
  }: AdminOverrideParams) => {
    console.log("🔑 Admin override for session full error - forcing join success");
    
    // For admins, we'll still let them join with a special participant ID
    const adminParticipantId = Math.floor(Math.random() * 900) + 9000; // Use a very high ID for admin override
    
    await registerParticipant({
      conversationId, 
      participantId: adminParticipantId,
      participantName: sanitizeInput(participantName),
      avatarSeed: sanitizeInput(avatarSeed),
      isAnonymous,
      isAdmin: true // Force admin for this registration
    });
    
    // Persist admin participant data
    persistParticipantData({
      participantId: adminParticipantId,
      conversationId,
      name: sanitizeInput(participantName),
      avatarSeed: sanitizeInput(avatarSeed),
      isAnonymous,
      isAdmin: true
    });
    
    toast({
      title: "Admin Override",
      description: "Session is full, but you're joining as an admin.",
      variant: "default"
    });
    
    return {
      participantId: adminParticipantId,
      name: sanitizeInput(participantName),
      avatarSeed: sanitizeInput(avatarSeed),
      isAdmin: true,
      isExistingParticipant: false
    };
  };

  return {
    handleAdminOverride
  };
}
