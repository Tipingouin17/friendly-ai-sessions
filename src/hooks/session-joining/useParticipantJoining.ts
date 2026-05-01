/**
 * use Participant Joining
 *
 * Calls the atomic /functions/v1/join-session backend endpoint which performs
 * capacity check + participant insert + count update + event log in a single
 * DB transaction.  This replaces the previous 7 sequential REST calls that
 * caused 20-35 s join latency.
 */

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";

interface JoinParticipantParams {
  conversationId: number;
  participantName: string;
  avatarSeed: string;
  currentParticipantCount: number;
  isAnonymous?: boolean;
  isAdmin?: boolean;
  conversation?: { join_token?: string; is_session_ended?: boolean; status?: string } | null;
}

export function useParticipantJoining() {
  const { toast } = useToast();
  const {
    persistParticipantData,
    getSessionByConversationId,
    updateSessionAccessTime
  } = useParticipantPersistence();

  const handleExistingParticipant = async (
    conversationId: number,
    participantName: string,
    avatarSeed: string
  ) => {
    const sessionData = getSessionByConversationId(conversationId);

    if (sessionData) {
      updateSessionAccessTime(conversationId);
      toast({
        title: "Rejoining Session",
        description: `Welcome back, ${sessionData.name || participantName}!`,
      });
      return {
        participantId: sessionData.participantId,
        name: sessionData.name || participantName,
        avatarSeed: sessionData.avatarSeed || avatarSeed,
        isAdmin: sessionData.isAdmin || false,
        isExistingParticipant: true
      };
    }

    return null;
  };

  const joinAsNewParticipant = async ({
    conversationId,
    participantName,
    avatarSeed,
    isAnonymous = false,
    isAdmin = false,
    conversation
  }: JoinParticipantParams) => {

    // Quick client-side validation using already-loaded conversation data
    // (avoids a network round-trip for obvious error cases)
    if (conversation) {
      if (conversation.is_session_ended) {
        throw new Error("This session has ended");
      }
      if (conversation.status && conversation.status !== 'active') {
        throw new Error("This session is not currently active");
      }
    }

    // Single atomic backend call — replaces 7 sequential REST calls
    const { data, error } = await supabase.functions.invoke('join-session', {
      body: {
        conversation_id: conversationId,
        participant_name: participantName,
        avatar_seed: avatarSeed,
        is_anonymous: isAnonymous,
        is_host: isAdmin,
      }
    });

    if (error) {
      // Parse the error message from the backend
      const msg = error.message || "Failed to join the session";
      throw new Error(msg);
    }

    if (!data?.success) {
      throw new Error("Failed to join the session");
    }

    const newParticipantId: number = data.participant_id;

    // Persist participant data to localStorage for rejoin detection
    persistParticipantData({
      participantId: newParticipantId,
      conversationId,
      name: participantName,
      avatarSeed,
      isAnonymous,
      isAdmin
    });

    return {
      participantId: newParticipantId,
      name: participantName,
      avatarSeed,
      isAdmin,
      isExistingParticipant: false
    };
  };

  return {
    handleExistingParticipant,
    joinAsNewParticipant
  };
}
