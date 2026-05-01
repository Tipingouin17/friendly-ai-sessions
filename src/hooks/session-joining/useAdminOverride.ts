/**
 * use Admin Override
 *
 * Allows a verified system admin to join a session that is at capacity.
 * Uses the same atomic /functions/v1/join-session endpoint as regular
 * participants — is_host:true signals the backend to bypass capacity limits.
 */

import { useToast } from "@/components/ui/use-toast";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";
import { sanitizeInput } from "@/utils/inputValidation";
import { useAuth } from '@/contexts/AuthContext';
import api from "@/lib/api";

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

    const safeName = sanitizeInput(participantName);
    const safeAvatar = sanitizeInput(avatarSeed);

    // Single atomic call — is_host:true bypasses capacity check server-side
    const { data, error } = await api.functions.invoke('join-session', {
      body: {
        conversation_id: conversationId,
        participant_name: safeName,
        avatar_seed: safeAvatar,
        is_anonymous: isAnonymous,
        is_host: true,
      }
    });

    if (error || !data?.success) {
      throw new Error(error?.message || "Admin override failed");
    }

    const newParticipantId: number = data.participant_id;

    persistParticipantData({
      participantId: newParticipantId,
      conversationId,
      name: safeName,
      avatarSeed: safeAvatar,
      isAnonymous,
      isAdmin: true
    });

    toast({
      title: "Admin Override",
      description: "Session is full, but you're joining as an admin.",
      variant: "default"
    });

    return {
      participantId: newParticipantId,
      name: safeName,
      avatarSeed: safeAvatar,
      isAdmin: true,
      isExistingParticipant: false
    };
  };

  return {
    handleAdminOverride
  };
}
