
import { useToast } from "@/components/ui/use-toast";
import { registerParticipant } from "./useParticipantRegistration";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";
import { sanitizeInput } from "@/utils/inputValidation";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AdminOverrideParams {
  conversationId: number;
  participantName: string;
  avatarSeed: string;
  isAnonymous?: boolean;
}

export function useAdminOverride() {
  const { toast } = useToast();
  const { persistParticipantData } = useParticipantPersistence();
  const { user } = useAuth();

  const handleAdminOverride = async ({
    conversationId,
    participantName,
    avatarSeed,
    isAnonymous = false
  }: AdminOverrideParams) => {
    // Verify admin status before allowing override
    if (!user) {
      throw new Error("Authentication required for admin override");
    }

    try {
      const { data: isAdmin, error } = await supabase.rpc('is_system_admin');
      
      if (error || !isAdmin) {
        throw new Error("Unauthorized: Admin privileges required");
      }

      // For verified admins, allow them to join with a special participant ID
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
    } catch (error) {
      console.error('Admin override failed:', error);
      throw error;
    }
  };

  return {
    handleAdminOverride
  };
}
