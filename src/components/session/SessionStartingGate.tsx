/**
 * Session Starting Gate
 *
 * Thin wrapper around ParticipantLoadingShell for the "AI generating welcome
 * message" phase.  All visual logic lives in ParticipantLoadingShell so that
 * every participant-side transition state looks identical.
 */

import React, { useState } from 'react';
import api from "@/lib/api";
import ParticipantLoadingShell, { ParticipantLoadingPhase } from './ParticipantLoadingShell';

interface SessionStartingGateProps {
  conversationId: number;
  facilitatorTitle?: string;
  isWaitingForMessage: boolean;
  timeoutReached: boolean;
  currentParticipantCount: number;
  maxParticipants: number;
  onForceGeneration?: () => void;
}

const SessionStartingGate: React.FC<SessionStartingGateProps> = ({
  conversationId,
  facilitatorTitle,
  isWaitingForMessage,
  timeoutReached,
  currentParticipantCount,
  maxParticipants,
  onForceGeneration,
}) => {
  const [retryCount, setRetryCount] = useState(0);

  // Derive the loading phase from the props
  let phase: ParticipantLoadingPhase;
  if (timeoutReached) {
    phase = 'timeout';
  } else if (!isWaitingForMessage) {
    phase = 'message_ready';
  } else {
    phase = 'ai_generating';
  }

  const handleRetryGeneration = async () => {
    setRetryCount(prev => prev + 1);
    try {
      if (onForceGeneration) {
        await onForceGeneration();
        return;
      }

      await api.functions.invoke('handle-facilitator-response', {
        body: {
          messages: [],
          conversationId,
          sessionStart: true,
          generateReport: false,
        },
      });
    } catch (err) {
      console.error('[SessionStartingGate] Retry failed:', err);
    }
  };

  return (
    <ParticipantLoadingShell
      phase={phase}
      facilitatorTitle={facilitatorTitle}
      currentParticipantCount={currentParticipantCount}
      maxParticipants={maxParticipants}
      retryCount={retryCount}
      onRetryGeneration={phase === 'timeout' ? handleRetryGeneration : undefined}
    />
  );
};

export default SessionStartingGate;
