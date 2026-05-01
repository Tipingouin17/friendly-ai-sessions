/**
 * useSessionTimer
 *
 * Manages the live countdown timer for a running session.
 *
 * - Derives end time from conversation.created_at + session_duration_minutes
 *   (or sessions.duration_minutes as fallback).
 * - When no duration is set (0 or null), the timer returns null values so the
 *   badge shows "No limit" with add-time buttons for the host.
 * - Exposes timeRemaining (seconds), isExpired, isWarning (≤10 min),
 *   isUrgent (≤2 min), and an addTime() function for the host.
 * - Persists any time extensions to the DB so all clients see the same end time.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { ConversationWithSession } from "@/types/database";

export interface SessionTimerState {
  /** Total seconds remaining until the session ends. null if no duration set. */
  timeRemaining: number | null;
  /** True when timeRemaining === 0 (only when a real duration was set) */
  isExpired: boolean;
  /** True when ≤ 10 minutes remain */
  isWarning: boolean;
  /** True when ≤ 2 minutes remain */
  isUrgent: boolean;
  /** True when no duration has been configured (session has no time limit) */
  hasNoDuration: boolean;
  /** Formatted string e.g. "42:07". null if no duration set. */
  formattedTime: string | null;
  /** Add minutes to the running session (host only) */
  addTime: (extraMinutes: number) => Promise<void>;
  /** Whether addTime is currently saving */
  isAddingTime: boolean;
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function useSessionTimer(
  conversation: ConversationWithSession | null,
  isHost = false
): SessionTimerState {
  // Effective duration: conversation override > session template > null
  // Treat 0 as "no duration set" (null) so the timer doesn't immediately show "Time's up"
  const rawDuration =
    conversation?.session_duration_minutes ??
    conversation?.sessions?.duration_minutes ??
    null;
  const effectiveDuration = (rawDuration === 0 || rawDuration === null) ? null : rawDuration;

  // Track the current duration in state so addTime can update it
  const [currentDuration, setCurrentDuration] = useState<number | null>(
    effectiveDuration
  );
  const [isAddingTime, setIsAddingTime] = useState(false);

  // When the host adds time to a no-duration session, we start the countdown
  // from the moment they first add time (not from created_at).
  const addTimeOriginRef = useRef<number | null>(null);

  // Keep currentDuration in sync when conversation data changes
  useEffect(() => {
    setCurrentDuration(effectiveDuration);
  }, [effectiveDuration]);

  // Compute end time:
  // - If the host added time to a previously no-duration session, use addTimeOriginRef
  // - Otherwise use conversation.created_at + currentDuration
  const endTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentDuration === null) {
      endTimeRef.current = null;
      return;
    }
    if (addTimeOriginRef.current !== null) {
      // Host set a duration mid-session — count from when they first added time
      endTimeRef.current = addTimeOriginRef.current + currentDuration * 60 * 1000;
    } else if (conversation?.created_at) {
      const startMs = new Date(conversation.created_at).getTime();
      endTimeRef.current = startMs + currentDuration * 60 * 1000;
    } else {
      endTimeRef.current = null;
    }
  }, [conversation?.created_at, currentDuration]);

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (endTimeRef.current === null) {
      setTimeRemaining(null);
      return;
    }

    const tick = () => {
      if (endTimeRef.current === null) {
        setTimeRemaining(null);
        return;
      }
      const remaining = Math.max(
        0,
        Math.round((endTimeRef.current - Date.now()) / 1000)
      );
      setTimeRemaining(remaining);
    };

    tick(); // immediate first tick
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTimeRef.current]);

  const addTime = useCallback(
    async (extraMinutes: number) => {
      if (!conversation?.id) return;
      setIsAddingTime(true);
      try {
        const base = currentDuration ?? 0;
        const newDuration = base + extraMinutes;
        // If this is the first time adding time to a no-duration session,
        // record the current moment as the countdown origin
        if (currentDuration === null) {
          addTimeOriginRef.current = Date.now();
        }
        const { error } = await api
          .from("conversations")
          .update({ session_duration_minutes: newDuration })
          .eq("id", conversation.id);
        if (!error) {
          setCurrentDuration(newDuration);
        }
      } finally {
        setIsAddingTime(false);
      }
    },
    [conversation?.id, currentDuration]
  );

  const hasNoDuration = currentDuration === null;
  const isExpired = !hasNoDuration && timeRemaining === 0;
  const isWarning = timeRemaining !== null && timeRemaining <= 600 && !isExpired && !hasNoDuration;
  const isUrgent = timeRemaining !== null && timeRemaining <= 120 && !isExpired && !hasNoDuration;
  const formattedTime =
    timeRemaining !== null && !hasNoDuration ? formatSeconds(timeRemaining) : null;

  return {
    timeRemaining,
    isExpired,
    isWarning,
    isUrgent,
    hasNoDuration,
    formattedTime,
    addTime,
    isAddingTime,
  };
}
