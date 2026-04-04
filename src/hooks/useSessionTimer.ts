/**
 * useSessionTimer
 *
 * Manages the live countdown timer for a running session.
 *
 * - Derives end time from conversation.created_at + session_duration_minutes
 *   (or sessions.duration_minutes as fallback).
 * - Exposes timeRemaining (seconds), isExpired, isWarning (≤10 min),
 *   isUrgent (≤2 min), and an addTime() function for the host.
 * - Persists any time extensions to the DB so all clients see the same end time.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ConversationWithSession } from "@/types/database";

export interface SessionTimerState {
  /** Total seconds remaining until the session ends. null if no duration set. */
  timeRemaining: number | null;
  /** True when timeRemaining === 0 */
  isExpired: boolean;
  /** True when ≤ 10 minutes remain */
  isWarning: boolean;
  /** True when ≤ 2 minutes remain */
  isUrgent: boolean;
  /** Formatted string e.g. "42:07" */
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
  const effectiveDuration =
    conversation?.session_duration_minutes ??
    conversation?.sessions?.duration_minutes ??
    null;

  // Track the current duration in state so addTime can update it
  const [currentDuration, setCurrentDuration] = useState<number | null>(
    effectiveDuration
  );
  const [isAddingTime, setIsAddingTime] = useState(false);

  // Keep currentDuration in sync when conversation data changes
  useEffect(() => {
    setCurrentDuration(effectiveDuration);
  }, [effectiveDuration]);

  // Compute end time from conversation.created_at + currentDuration
  const endTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!conversation?.created_at || currentDuration === null) {
      endTimeRef.current = null;
      return;
    }
    const startMs = new Date(conversation.created_at).getTime();
    endTimeRef.current = startMs + currentDuration * 60 * 1000;
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
      if (!conversation?.id || currentDuration === null) return;
      setIsAddingTime(true);
      try {
        const newDuration = currentDuration + extraMinutes;
        const { error } = await supabase
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

  const isExpired = timeRemaining === 0;
  const isWarning = timeRemaining !== null && timeRemaining <= 600 && !isExpired;
  const isUrgent = timeRemaining !== null && timeRemaining <= 120 && !isExpired;
  const formattedTime =
    timeRemaining !== null ? formatSeconds(timeRemaining) : null;

  return {
    timeRemaining,
    isExpired,
    isWarning,
    isUrgent,
    formattedTime,
    addTime,
    isAddingTime,
  };
}
