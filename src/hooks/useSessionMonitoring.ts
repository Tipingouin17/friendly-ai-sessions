
import { useEffect } from "react";
import { useSessionStartMonitor } from "@/hooks/useSessionStartMonitor";
import { useSessionRoomState } from "@/hooks/useSessionRoomState";
import { ConversationWithSession } from "@/types/database";
import { ParticipantInfo } from "@/types/chat";

interface UseSessionMonitoringProps {
  conversation: ConversationWithSession | null;
  conversationId: number | null;
  currentUserParticipantId: number | null;
  participants: ParticipantInfo[];
  onError: (error: string) => void;
}

export const useSessionMonitoring = ({
  conversation,
  conversationId,
  currentUserParticipantId,
  participants,
  onError
}: UseSessionMonitoringProps) => {
  // Monitor session start status
  const isSessionStartedInDB = useSessionStartMonitor({ conversation });

  // Log session start status for debugging
  useEffect(() => {
    console.log("Session start monitoring:", { 
      isSessionStartedInDB,
      conversationStarted: conversation?.session_started
    });
  }, [isSessionStartedInDB, conversation?.session_started]);

  // Set up session room state 
  const roomState = useSessionRoomState({
    conversationId,
    conversation,
    currentUserParticipantId,
    participants,
    welcomeMessage: conversation?.sessions?.welcome_message ?? null
  });

  // Handle room state errors
  useEffect(() => {
    if (roomState.error) {
      console.error("Room state error:", roomState.error);
      onError(roomState.error);
    }
  }, [roomState.error, onError]);

  return {
    isSessionStartedInDB,
    roomState
  };
};
