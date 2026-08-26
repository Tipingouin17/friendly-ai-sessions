/**
 * use Join Session Data
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect } from "react";
import { createLogger } from '@/utils/debugLogger';

const log = createLogger('useJoinSessionData', 'session');
// usePlanLimits is intentionally NOT used on the join page.
// Participants are unauthenticated — plan limits are irrelevant here.
// The only source of truth for max participants is conversation.participants.
import { useSessionParticipants } from "@/hooks/useSessionParticipants";
import { useSessionJoiner } from "@/hooks/session-joining";
import { ConversationWithSession } from "@/types/database";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";
import { useToast } from "@/components/ui/use-toast";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";
import { useParticipantDatabase } from "@/hooks/useParticipantDatabase";
import { isOrdinalParticipantLabel } from "@/utils/inputValidation";

interface UseJoinSessionDataOptions {
  defaultParticipantName?: string;
  defaultAvatarSeed?: string;
}

interface JoinResult {
  participantId: number;
  name: string;
  avatarSeed: string;
  isAdmin: boolean;
}

export function useJoinSessionData(
  conversationId: number | null,
  options?: UseJoinSessionDataOptions
) {
  const { toast } = useToast();
  const { isAdmin } = useSessionAdminStatus();

  // Check if on admin route for stronger admin override
  const isOnAdminPath = window.location.pathname.includes('/admin');
  const effectiveIsAdmin = isAdmin || isOnAdminPath || sessionStorage.getItem('isAdminSession') === 'true';

  // Get persisted participant data
  const { getSessionByConversationId } = useParticipantPersistence();
  const existingSessionData = conversationId ? getSessionByConversationId(conversationId) : null;

  // Initialize participant state with provided defaults (pure, no side effects)
  const [participantName, setParticipantName] = useState(() => options?.defaultParticipantName || "");
  const [avatarSeed, setAvatarSeed] = useState(() => options?.defaultAvatarSeed || Math.random().toString());

  // Debug logging
  useEffect(() => { /* no-op */ }, [conversationId, isAdmin, effectiveIsAdmin, isOnAdminPath, existingSessionData]);

  // No plan-limit fallback on the join page — use only conversation.participants.
  // If the host didn't set a limit (null/0), the session has unlimited capacity.

  // Use our hooks
  const { participants: joinedParticipants } = useParticipantDatabase(conversationId);

  const {
    currentParticipantCount,
    maxParticipantsForSession,
    conversation,
    error: participantsError,
    refetch,
    isLoading: isParticipantsLoading,
    isTokenReady
  } = useSessionParticipants(conversationId);

  const {
    isJoining,
    error: joinerError,
    joinSession,
    setError
  } = useSessionJoiner();

  // Combine errors from both hooks
  const error = participantsError || joinerError;

  // Check if this is an admin joining
  useEffect(() => {
    if (effectiveIsAdmin && conversationId) { /* no-op */ }
  }, [effectiveIsAdmin, conversationId]);

  const handleJoinSession = async (): Promise<JoinResult | null> => {
    // Enhanced admin detection - check all sources
    const effectiveIsAdmin = isAdmin ||
      isOnAdminPath ||
      sessionStorage.getItem('isAdminSession') === 'true' ||
      window.location.pathname.includes('/admin');

    // ── Pre-validation: check session state BEFORE making any network call ──
    // This prevents the join button from hanging indefinitely when the session
    // is not yet active (Railway backend times out on these requests).
    if (conversation) {
      if (conversation.is_session_ended) {
        toast({
          title: "Session Ended",
          description: "This session has already ended.",
          variant: "destructive",
        });
        setError("This session has already ended.");
        return null;
      }
      if (conversation.status && conversation.status !== 'active') {
        toast({
          title: "Session Not Started",
          description: "The host hasn't started the session yet. Please wait and try again.",
          variant: "destructive",
        });
        setError("The host hasn't started the session yet. Please wait and try again.");
        return null;
      }
    }

    // NOTE: Pre-join refetch removed — the atomic /functions/v1/join-session
    // endpoint performs its own capacity check server-side in the same DB
    // transaction.  A client-side refetch before joining was redundant and
    // added up to 8 s of latency on slow connections.

    // Use only the session-specific attendee max. 0 means no limit.
    const effectiveMaxParticipants = maxParticipantsForSession;
    const effectiveCurrentAttendees = Math.max(currentParticipantCount - 1, 0);

    if (!participantName.trim()) {
      toast({
        title: "Please enter your name",
        description: "A name is required to join the session.",
        variant: "destructive",
      });
      return null;
    }

    if (isOrdinalParticipantLabel(participantName)) {
      toast({
        title: "Use your display name",
        description: "Enter the name other participants should call you, rather than a numbered participant label.",
        variant: "destructive",
      });
      return null;
    }

    // Skip check if on admin route or admin user - they should always be able to join
    if (!isOnAdminPath && !effectiveIsAdmin) {
      // Only check if attendee capacity is full if effectiveMaxParticipants is greater than 0
      if (effectiveMaxParticipants > 0 && effectiveCurrentAttendees >= effectiveMaxParticipants) {
        toast({
          title: "Session Full",
          description: "This session has reached its maximum capacity of participants.",
          variant: "destructive",
        });
        setError("This session has reached its maximum capacity of participants.");
        return null;
      }
    }

    const result = await joinSession({
      conversationId,
      participantName,
      avatarSeed,
      conversation: conversation as ConversationWithSession,
      currentParticipantCount,
      refetch,
      isAdmin: effectiveIsAdmin
    });

    if (result) {
      // Just return the result - don't store it in state
    }

    return result;
  };

  // Use only the session-specific attendee max. 0 means no limit.
  const effectiveMaxParticipants = maxParticipantsForSession;
  const effectiveCurrentAttendees = Math.max(currentParticipantCount - 1, 0);

  // Only consider session full if attendee capacity is reached and we're not an admin.
  const isFull = !effectiveIsAdmin &&
    !isOnAdminPath &&
    effectiveMaxParticipants > 0 &&
    effectiveCurrentAttendees >= effectiveMaxParticipants;

  return {
    participantName,
    setParticipantName,
    avatarSeed,
    setAvatarSeed,
    isJoining,
    currentParticipantCount,
    effectiveMaxParticipants,
    isFull,
    conversation,
    isLoading: isParticipantsLoading || (!conversation && !error),
    error,
    handleJoinSession,
    existingSessionData,
    isTokenReady,
    joinedParticipants: joinedParticipants.filter(participant => !participant.isHost)
  };
}
