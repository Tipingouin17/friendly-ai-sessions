
import { useState, useEffect, useCallback } from 'react';
import { useHostParticipantRegistration } from './useHostParticipantRegistration';

interface UseHostParticipantContextProps {
  conversationId: number | null;
  isHostPage: boolean;
  hostName?: string;
}

export function useHostParticipantContext({
  conversationId,
  isHostPage,
  hostName = "Host"
}: UseHostParticipantContextProps) {
  const [participantMode, setParticipantMode] = useState<'observer' | 'participant'>('observer');
  const [currentUserParticipantId, setCurrentUserParticipantId] = useState<number | null>(null);

  const { 
    registerHostAsParticipant, 
    hostParticipantId, 
    isRegistering 
  } = useHostParticipantRegistration({
    conversationId: conversationId || 0,
    hostName
  });

  // Enable participant mode for hosts who want to participate
  const enableParticipantMode = useCallback(async () => {
    if (!conversationId || !isHostPage) return;

    console.log("🔄 Enabling participant mode for host");
    
    const participantId = await registerHostAsParticipant();
    if (participantId) {
      setParticipantMode('participant');
      setCurrentUserParticipantId(participantId);
      console.log("✅ Host participant mode enabled with ID:", participantId);
    }
  }, [conversationId, isHostPage, registerHostAsParticipant]);

  // Auto-enable participant mode for hosts (they can always participate)
  useEffect(() => {
    if (isHostPage && conversationId && participantMode === 'observer') {
      enableParticipantMode();
    }
  }, [isHostPage, conversationId, participantMode, enableParticipantMode]);

  // Update participant ID when registration completes
  useEffect(() => {
    if (hostParticipantId && !currentUserParticipantId) {
      setCurrentUserParticipantId(hostParticipantId);
      setParticipantMode('participant');
    }
  }, [hostParticipantId, currentUserParticipantId]);

  return {
    participantMode,
    currentUserParticipantId,
    enableParticipantMode,
    isRegistering,
    canSendMessages: participantMode === 'participant' && currentUserParticipantId !== null
  };
}
