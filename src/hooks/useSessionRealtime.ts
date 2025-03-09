
import { useState } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { useConversationChannel } from "./useConversationChannel";
import { useParticipantsChannel } from "./useParticipantsChannel";
import { useMessagesChannel } from "./useMessagesChannel";

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
  
  // Use our specialized hooks for different channel types
  const { error: conversationError } = useConversationChannel({
    conversationId: currentConversationId,
    onSessionStarted,
    onSessionFull: handleSessionFull,
    refetch,
    conversation
  });
  
  const { error: participantsError } = useParticipantsChannel({
    conversationId: currentConversationId,
    participants,
    setParticipants
  });
  
  const { error: messagesError } = useMessagesChannel({
    conversationId: currentConversationId,
    refetch
  });
  
  // Combine errors from all hooks
  useState(() => {
    const combinedError = conversationError || participantsError || messagesError;
    if (combinedError) {
      setError(combinedError);
    } else {
      setError(null);
    }
  });
  
  return { error };
};
