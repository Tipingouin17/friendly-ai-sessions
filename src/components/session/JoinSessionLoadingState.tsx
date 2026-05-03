/**
 * Join Session Loading State
 *
 * Thin wrapper around ParticipantLoadingShell for the initial join / connect
 * phase.  Keeps the same external API so existing callers don't need to change.
 */

import React, { useEffect, useRef, useState } from 'react';
import ParticipantLoadingShell, { ParticipantLoadingPhase } from './ParticipantLoadingShell';

interface JoinSessionLoadingStateProps {
  onRetry?: () => void;
  error?: string | null;
  retryCount?: number;
  loadingTimeElapsed?: number;
  customMessage?: string;
}

const JoinSessionLoadingState: React.FC<JoinSessionLoadingStateProps> = ({
  onRetry,
  error,
  retryCount = 0,
  loadingTimeElapsed = 0,
}) => {
  const [elapsed, setElapsed] = useState(loadingTimeElapsed);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const interval = setInterval(() => {
      if (mountedRef.current) setElapsed(e => e + 1);
    }, 1000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  // Derive the loading phase from elapsed time and error state
  let phase: ParticipantLoadingPhase;
  if (error) {
    phase = 'error';
  } else if (elapsed > 15) {
    phase = 'timeout';
  } else {
    phase = 'connecting';
  }

  return (
    <ParticipantLoadingShell
      phase={phase}
      errorMessage={error ?? undefined}
      onRetry={onRetry}
      retryCount={retryCount}
    />
  );
};

export default JoinSessionLoadingState;
