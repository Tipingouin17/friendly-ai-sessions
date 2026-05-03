/**
 * useInactivityTimer
 *
 * Indicative inactivity timer for the Host view.
 *
 * Starts counting from the moment the last AI facilitator message was sent
 * (i.e. when the session is "waiting for responses").  After `thresholdSeconds`
 * (default: 180 = 3 min) without all participants having responded, it sets
 * `isInactive` to true so the Host UI can show an alert.
 *
 * The timer is purely informational — it never triggers any automatic action.
 * The Host remains in full control of when to advance the session.
 *
 * The timer resets automatically whenever:
 *  - A new AI facilitator message arrives (new question asked)
 *  - All participants have responded (responseCount >= effectiveTotal)
 *  - The session ends
 */

import { useEffect, useRef, useState } from 'react';
import { Message } from '@/types/chat';

interface UseInactivityTimerProps {
  /** All session messages */
  messages: Message[];
  /** Number of participants who have responded to the current question */
  responseCount: number;
  /** Total number of active (non-paused) participants */
  totalParticipants: number;
  /** Whether the session is currently waiting for participant responses */
  isWaitingForResponses: boolean;
  /** Whether the session has ended */
  isSessionEnded?: boolean;
  /** Inactivity threshold in seconds (default: 180 = 3 min) */
  thresholdSeconds?: number;
}

interface UseInactivityTimerReturn {
  /** Seconds elapsed since the last AI message with no new response */
  elapsedSeconds: number;
  /** True when elapsed >= thresholdSeconds and not all participants have responded */
  isInactive: boolean;
  /** Number of participants who have NOT yet responded */
  pendingCount: number;
  /** Manually reset the timer (e.g. after the host dismisses the alert) */
  resetTimer: () => void;
}

export function useInactivityTimer({
  messages,
  responseCount,
  totalParticipants,
  isWaitingForResponses,
  isSessionEnded = false,
  thresholdSeconds = 180,
}: UseInactivityTimerProps): UseInactivityTimerReturn {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track the id of the last assistant message so we can detect when a new
  // question arrives and reset the timer.
  const lastAssistantMsgIdRef = useRef<string | null>(null);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resetTimer = () => {
    clearTimer();
    setElapsedSeconds(0);
  };

  useEffect(() => {
    // Find the last assistant message
    const lastAssistantMsg = [...messages].reverse().find(m => m.sender === 'assistant');

    // If a new AI question arrived, reset the timer
    if (lastAssistantMsg && lastAssistantMsg.id !== lastAssistantMsgIdRef.current) {
      lastAssistantMsgIdRef.current = lastAssistantMsg.id;
      resetTimer();
    }

    // Conditions under which the timer should NOT be running
    const allResponded = totalParticipants > 0 && responseCount >= totalParticipants;
    const shouldRun = isWaitingForResponses && !allResponded && !isSessionEnded && !!lastAssistantMsg;

    if (!shouldRun) {
      clearTimer();
      if (allResponded || isSessionEnded) setElapsedSeconds(0);
      return;
    }

    // Start the interval if not already running
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }

    return () => {
      // Do NOT clear on every render — only on unmount (handled by the
      // outer cleanup returned below).
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, responseCount, totalParticipants, isWaitingForResponses, isSessionEnded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, []);

  const pendingCount = Math.max(0, totalParticipants - responseCount);
  const isInactive = elapsedSeconds >= thresholdSeconds && pendingCount > 0 && isWaitingForResponses && !isSessionEnded;

  return { elapsedSeconds, isInactive, pendingCount, resetTimer };
}
