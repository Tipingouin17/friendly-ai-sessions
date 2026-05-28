/**
 * use Session Realtime
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect, useRef } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import {
  createConversationChannel,
  createParticipantsChannel,
  createMessagesChannel
} from "@/utils/realtimeConnectionManager";
import { removeChannel } from "@/utils/realtimeHelpers";
import { getParticipantInfo } from "@/utils/participantUtils";

type UseSessionRealtimeProps = {
  currentConversationId: number | null;
  participants: ParticipantInfo[];
  setParticipants: React.Dispatch<React.SetStateAction<ParticipantInfo[]>>;
  conversation: ConversationWithSession | null;
  refetch: () => void;
  handleSessionFull?: () => void;
  onSessionStarted?: () => void;
};

export const useSessionRealtime = ({
  currentConversationId,
  participants,
  setParticipants,
  conversation,
  refetch,
  handleSessionFull,
  onSessionStarted
}: UseSessionRealtimeProps) => {
  const [error, setError] = useState<string | null>(null);
  const [sessionStartedCalled, setSessionStartedCalled] = useState(false);
  const [sessionFullCalled, setSessionFullCalled] = useState(false);

  // Use refs to track active channels and prevent duplicate subscriptions
  const conversationChannelRef = useRef<any>(null);
  const participantsChannelRef = useRef<any>(null);
  const messagesChannelRef = useRef<any>(null);
  const setupCompletedRef = useRef(false);

  // Set up realtime channels
  useEffect(() => {
    if (!currentConversationId || setupCompletedRef.current) {
      return;
    }

    // Mark setup as completed
    setupCompletedRef.current = true;

    // Check initial state
    if (conversation) {
      // Check if session is already started. Newer schemas may include session_started_at,
      // but session_started is the durable cross-deployment flag that moves participants live.
      if (conversation.session_started && !sessionStartedCalled) {
        setSessionStartedCalled(true);
        if (onSessionStarted) onSessionStarted();
      }

      // Check if attendee capacity is already full. current_participants and
      // stored participants both include the host; product capacity is attendees only.
      const attendeeCount = Math.max(0, (conversation.current_participants || 0) - 1);
      const attendeeCapacity = Math.max((conversation.participants || 0) - 1, 0);
      if (attendeeCount >= attendeeCapacity &&
          attendeeCapacity > 0 &&
          !sessionFullCalled) {
        setSessionFullCalled(true);
        if (handleSessionFull) handleSessionFull();
      }
    }

    // Create conversation channel
    try {
      conversationChannelRef.current = createConversationChannel(
        currentConversationId,
        (payload) => {

          if (payload.new) {
            // Handle session started
            if (payload.new.session_started && !sessionStartedCalled) {
              setSessionStartedCalled(true);
              if (onSessionStarted) onSessionStarted();
            }

            // Handle session full using non-host attendee capacity.
            const attendeeCount = Math.max(0, (payload.new.current_participants || 0) - 1);
            const attendeeCapacity = Math.max((payload.new.participants || 0) - 1, 0);
            if (attendeeCount >= attendeeCapacity &&
                attendeeCapacity > 0 &&
                !sessionFullCalled) {
              setSessionFullCalled(true);
              if (handleSessionFull) handleSessionFull();
            }

            // Refresh data
            refetch();
          }
        }
      );

      // Create participants channel
      participantsChannelRef.current = createParticipantsChannel(
        currentConversationId,
        async (payload) => {

          if (payload.new) {
            // Add new participant if not already in list
            if (!participants.some(p => p.id === payload.new.participant_id)) {
              try {
                const participantInfo = await getParticipantInfo(payload.new);

                setParticipants(current => {
                  if (current.some(p => p.id === participantInfo.id)) {
                    return current;
                  }
                  return [...current, participantInfo];
                });
              } catch (error) {
                console.error("Error getting participant info:", error);
                setError("Error retrieving participant information");
              }
            }
          }
        }
      );

      // Create messages channel
      messagesChannelRef.current = createMessagesChannel(
        currentConversationId,
        (payload) => {
          refetch();
        }
      );
    } catch (err) {
      console.error("Error setting up realtime channels:", err);
      setError("Failed to establish realtime connection");
    }

    // Cleanup function
    return () => {
      setupCompletedRef.current = false;
      try {
        if (conversationChannelRef.current) {
          removeChannel(conversationChannelRef.current);
          conversationChannelRef.current = null;
        }

        if (participantsChannelRef.current) {
          removeChannel(participantsChannelRef.current);
          participantsChannelRef.current = null;
        }

        if (messagesChannelRef.current) {
          removeChannel(messagesChannelRef.current);
          messagesChannelRef.current = null;
        }
      } catch (err) {
        console.error("Error removing channels:", err);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
  }, [currentConversationId]);

  // Secondary effect to check conversation state from props
  useEffect(() => {
    if (conversation && currentConversationId) {
      // Check for session status
      if (conversation.session_started && !sessionStartedCalled) {
        setSessionStartedCalled(true);
        if (onSessionStarted && typeof onSessionStarted === 'function') {
          onSessionStarted();
        }
      }

      // Check if attendee capacity is full. current_participants and stored
      // participants include the host; product capacity is attendees only.
      const attendeeCount = Math.max(0, (conversation.current_participants || 0) - 1);
      const attendeeCapacity = Math.max((conversation.participants || 0) - 1, 0);
      if (attendeeCount >= attendeeCapacity &&
          attendeeCapacity > 0 &&
          !sessionFullCalled) {
        setSessionFullCalled(true);
        if (handleSessionFull && typeof handleSessionFull === 'function') {
          handleSessionFull();
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
  }, [conversation, currentConversationId, onSessionStarted, handleSessionFull]);

  return { error };
};
