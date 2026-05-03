/**
 * Participant Waiting Screen
 *
 * Thin wrapper around ParticipantLoadingShell for the "waiting for host to
 * start the session" phase.  Realtime subscription logic is kept here; all
 * visual rendering is delegated to ParticipantLoadingShell so the participant
 * sees a single consistent branded UI throughout every transition state.
 */

import React, { useEffect, useState } from 'react';
import api from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { removeChannel } from "@/utils/realtimeHelpers";
import ParticipantLoadingShell from './ParticipantLoadingShell';

interface ParticipantWaitingScreenProps {
  conversationId?: number | null;
  currentParticipantCount: number;
  maxParticipants?: number;
  facilitatorTitle?: string;
  onSessionStarted?: () => void;
}

const ParticipantWaitingScreen: React.FC<ParticipantWaitingScreenProps> = ({
  conversationId,
  currentParticipantCount,
  maxParticipants,
  facilitatorTitle,
  onSessionStarted,
}) => {
  const { toast } = useToast();
  const [participantCount, setParticipantCount] = useState(currentParticipantCount || 0);

  // Keep local count in sync with prop (e.g. on initial render)
  useEffect(() => {
    setParticipantCount(currentParticipantCount || 0);
  }, [currentParticipantCount]);

  // Real-time subscription: participant count + session start
  useEffect(() => {
    if (!conversationId) return;

    try {
      const conversationChannel = api
        .channel(`conversation-updates-${conversationId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${conversationId}` },
          (payload) => {
            if (!payload.new) return;
            if (payload.new.current_participants != null && payload.new.current_participants >= 0) {
              setParticipantCount(payload.new.current_participants);
            }
            if (payload.new.session_started && (!payload.old || !payload.old.session_started)) {
              toast({ title: 'Session Started', description: 'The session has been started by the host.' });
              if (onSessionStarted) setTimeout(onSessionStarted, 1000);
            }
          },
        )
        .subscribe();

      const eventsChannel = api
        .channel(`session-events-${conversationId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'session_events', filter: `conversation_id=eq.${conversationId}` },
          (payload) => {
            if (payload.new?.event_type === 'participant_joined') {
              const d = payload.new.data;
              if (d?.current_count !== undefined) setParticipantCount(d.current_count);
            }
          },
        )
        .subscribe();

      return () => {
        removeChannel(conversationChannel);
        removeChannel(eventsChannel);
      };
    } catch (err) {
      console.error('[ParticipantWaitingScreen] Subscription error:', err);
    }
  }, [conversationId, onSessionStarted, toast]);

  return (
    <ParticipantLoadingShell
      phase="waiting_host"
      facilitatorTitle={facilitatorTitle}
      currentParticipantCount={participantCount}
      maxParticipants={maxParticipants}
    />
  );
};

export default ParticipantWaitingScreen;
