/**
 * use Participant Counts
 *
 * Hook for the AIfacilitator application.
 *
 * Values are derived directly from the conversation object on every render
 * (no useState/useEffect indirection) so they are always in sync with the
 * latest data from React Query — even on slow mobile connections where the
 * previous useState approach caused a one-render lag.
 *
 * setCurrentParticipantCount / setMaxParticipantsForSession are kept in the
 * return value for backward compatibility with callers that override the
 * counts from realtime channel events (e.g. useParticipantChannel).
 */

import { useState, useEffect } from "react";
import { ConversationWithSession } from "@/types/database";

export function useParticipantCounts(conversation: ConversationWithSession | null) {
  // Realtime overrides — only used when a channel event pushes a newer count
  // than what the conversation object currently holds.
  const [realtimeCurrentCount, setRealtimeCurrentCount] = useState<number | null>(null);
  const [realtimeMaxCount, setRealtimeMaxCount] = useState<number | null>(null);

  // Reset realtime overrides when the conversation changes (e.g. a fresh fetch
  // returns updated data that supersedes the last realtime event).
  useEffect(() => {
    setRealtimeCurrentCount(null);
    setRealtimeMaxCount(null);
  }, [conversation?.id]);

  // Derive counts directly from conversation — no useState lag.
  const conversationCurrent =
    conversation?.current_participants !== null &&
    typeof conversation?.current_participants === "number" &&
    conversation.current_participants >= 0
      ? conversation.current_participants
      : 0;

  const conversationMax =
    conversation?.participants !== null &&
    typeof conversation?.participants === "number" &&
    conversation.participants > 0
      ? conversation.participants
      : 0;

  // Prefer realtime override when it is more recent (non-null), otherwise
  // fall back to the value from the conversation object.
  const currentParticipantCount = realtimeCurrentCount !== null ? realtimeCurrentCount : conversationCurrent;
  const maxParticipantsForSession = realtimeMaxCount !== null ? realtimeMaxCount : conversationMax;

  return {
    currentParticipantCount,
    setCurrentParticipantCount: setRealtimeCurrentCount,
    maxParticipantsForSession,
    setMaxParticipantsForSession: setRealtimeMaxCount,
  };
}
