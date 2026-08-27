/**
 * use Participant Joining
 *
 * Calls the atomic /functions/v1/join-session backend endpoint which performs
 * capacity check + participant insert + count update + event log in a single
 * DB transaction.  This replaces the previous 7 sequential REST calls that
 * caused 20-35 s join latency.
 */

import api, { getJoinToken, setJoinToken } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";
import { getOrCreateDeviceId } from "@/hooks/useDeviceId";
import { isOrdinalParticipantLabel } from "@/utils/inputValidation";

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
    const deviceId = getOrCreateDeviceId();
    const sessionData = getSessionByConversationId(conversationId);

    // Only treat as existing participant if the device_id matches.
    // This prevents a different browser from hijacking a slot by reusing
    // the same participantId from the URL.
    if (sessionData && sessionData.deviceId === deviceId) {
      // Verify the slot still exists in the DB — the host may have removed
      // this participant since the last visit.  If the row is gone we must
      // fall through to joinAsNewParticipant so the backend assigns a fresh
      // slot instead of silently reusing a phantom participant_id.
      try {
        const { data: rows, error } = await api
          .from('session_participants')
          .select('participant_id')
          .eq('conversation_id', conversationId)
          .eq('participant_id', sessionData.participantId);

        if (error || !rows || rows.length === 0) {
          // Slot no longer exists — clear stale local state and fall through
          // to joinAsNewParticipant.
          return null;
        }
      } catch {
        // Network error — optimistically allow rejoin; the backend will
        // handle the device_id lookup and create/reuse the slot.
      }

      // A historical ordinal label is a recoverable setup defect, not an
      // identity. Returning null deliberately routes the new real name through
      // joinAsNewParticipant; the atomic endpoint sees the same device_id and
      // updates the existing slot without consuming another seat.
      if (isOrdinalParticipantLabel(sessionData.name) && !isOrdinalParticipantLabel(participantName)) {
        return null;
      }

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

    const deviceId = getOrCreateDeviceId();

    // Pass the join_token explicitly in the body as a safety net.
    // apiFetch() reads getJoinToken() at call time via the X-Join-Token header,
    // but if the token was written to localStorage in the same render cycle by
    // useSessionParticipants there can be a race where the header is absent.
    // Sending it in the body ensures the backend always receives it.
    const joinToken =
      getJoinToken(String(conversationId)) ||
      conversation?.join_token ||
      null;

    // Single atomic backend call — replaces 7 sequential REST calls
    const { data, error } = await api.functions.invoke('join-session', {
      body: {
        conversation_id: conversationId,
        participant_name: participantName,
        avatar_seed: avatarSeed,
        is_anonymous: isAnonymous,
        is_host: isAdmin,
        device_id: deviceId,
        ...(joinToken ? { join_token: joinToken } : {}),
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

    // The participant transitions to `/session?id=…` after this point, which
    // intentionally removes the token from the visible URL. Re-persist the
    // already-validated QR token at the successful join boundary so mobile
    // Safari cannot retain a participant identity while losing the scoped
    // credential required by durable message reads after the host starts.
    // The key is conversation-scoped and is never used for another room.
    if (joinToken) {
      try {
        setJoinToken(joinToken, String(conversationId));
      } catch (error) {
        // The existing participant-data persistence below will surface a
        // storage failure through its normal recovery path. Do not convert a
        // completed server-side join into an opaque client crash.
        console.warn('Failed to persist scoped participant join token:', error);
      }
    }

    // Persist participant data to localStorage for rejoin detection.
    // The deviceId is stored alongside so handleExistingParticipant can
    // verify the returning browser is the same one that originally joined.
    persistParticipantData({
      participantId: newParticipantId,
      conversationId,
      name: participantName,
      avatarSeed,
      isAnonymous,
      isAdmin,
      deviceId,
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
