/**
 * Explicit host-start compatibility hook.
 *
 * Full attendance is a readiness signal only. It must never transition a
 * workshop into the live state: the host is the sole authority that invokes
 * the atomic start-session endpoint.
 */

import { useCallback } from 'react';

interface UseAutoStartSessionProps {
  onStartSession: () => Promise<void>;
  isSessionStarted: boolean;
  maxParticipants: number;
}

export const useAutoStartSession = (_props: UseAutoStartSessionProps) => {
  // Retain the public hook shape while deliberately making legacy callers
  // inert. This prevents old realtime and capacity callbacks from bypassing
  // the host’s explicit Start Session action.
  const triggerAutoStart = useCallback(async (
    _currentParticipantCount: number,
    _maxParticipantsOverride?: number,
  ) => undefined, []);

  const cancelAutoStart = useCallback(() => undefined, []);
  const cleanup = useCallback(() => undefined, []);

  return {
    isAutoStarting: false,
    autoStartCountdown: 0,
    triggerAutoStart,
    cancelAutoStart,
    cleanup,
  };
};
