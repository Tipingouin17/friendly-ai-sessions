/**
 * use Participant Joining
 *
 * Session joining hook for the AIfacilitator application.
 */

import { supabase } from "@/integrations/supabase/client";
import { setJoinToken } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { registerParticipant } from "./useParticipantRegistration";
import { useSessionCapacityCheck } from "./useSessionCapacityCheck";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";

interface JoinParticipantParams {
  conversationId: number;
  participantName: string;
  avatarSeed: string;
  currentParticipantCount: number;
  isAnonymous?: boolean;
  isAdmin?: boolean;
  /** The already-loaded conversation object — used to validate session state
   *  without making a redundant authenticated API call. */
  conversation?: { join_token?: string; is_session_ended?: boolean; status?: string } | null;
}

export function useParticipantJoining() {
  const { toast } = useToast();
  const { checkCapacityAndUpdate } = useSessionCapacityCheck();
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
      // Update the last accessed time
      updateSessionAccessTime(conversationId);

      // Show rejoining toast
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
    currentParticipantCount,
    isAnonymous = false,
    isAdmin = false,
    conversation
  }: JoinParticipantParams) => {

    // ── Session state validation ─────────────────────────────────────────────
    // Use the already-loaded conversation object instead of making a second
    // unauthenticated API call (which would fail on mobile without a token).
    // The form is only rendered after the conversation loads, so these checks
    // are always against fresh data.
    if (conversation) {
      if (conversation.is_session_ended) {
        throw new Error("This session has ended");
      }
      if (conversation.status && conversation.status !== 'active') {
        throw new Error("This session is not currently active");
      }
      // Ensure the join token is set before any subsequent API calls.
      // On mobile with a plain ?id=X URL, sessionStorage may be empty.
      // The token is in the conversation response — set it now so that
      // checkCapacityAndUpdate and registerParticipant carry the header.
      if (conversation.join_token) {
        // Store under the scoped key mf_join_token_{conversationId}
        setJoinToken(conversation.join_token, String(conversationId));
      }
    }

    // FIXED: Check capacity without updating count - count will be updated after successful registration
    let capacityResult;
    try {
      capacityResult = await checkCapacityAndUpdate(conversationId, isAdmin);
    } catch (capacityError) {
      console.error("Error during capacity check:", capacityError);
      throw capacityError;
    }

    // If the session is full and we're not an admin, block joining
    if (!capacityResult.canJoin && !isAdmin) {
      console.error("Join blocked - session at capacity:", capacityResult.error);
      throw new Error(capacityResult.error || "This session is full and cannot accept more participants.");
    }

    // Use the returned participant count as the participant ID
    const newParticipantId = capacityResult.newParticipantId;

    // FIXED: Register participant first, which will handle count updates correctly
    try {
      await registerParticipant({
        conversationId,
        participantId: newParticipantId,
        participantName,
        avatarSeed,
        isAnonymous,
        isAdmin
      });
    } catch (registerError) {
      console.error("Error registering participant:", registerError);
      throw registerError;
    }

    // Create a session_event to log the participant successfully joining
    try {
      await supabase
        .from('session_events')
        .insert({
          conversation_id: conversationId,
          event_type: 'participant_joined',
          data: {
            participant_id: newParticipantId,
            participant_name: participantName,
            avatar_url: avatarSeed ? `/api/avatar?name=${avatarSeed}&variant=beam&palette=0` : null,
            is_anonymous: isAnonymous,
            is_admin: isAdmin,
            timestamp: new Date().toISOString()
          }
        });
    } catch (eventError) {
      console.error("Error logging participant join event:", eventError);
      // Don't block the join process if event logging fails
    }

    // Persist participant data to localStorage
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
