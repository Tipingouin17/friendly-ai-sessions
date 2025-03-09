
import { useMessageSender } from "./useMessageSender";
import { useMessageRealtime } from "./useMessageRealtime";
import { useMessageLikes } from "./useMessageLikes";
import { Message } from "@/types/chat";

type UseSessionInteractionsProps = {
  currentConversationId: number | null;
  sessionState: {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    inputMessage: string;
    setInputMessage: (message: string) => void;
    currentParticipant: number;
    recordResponse: (participantId: number, hasResponded: boolean) => void;
    totalResponses: number;
    hasAnswered: boolean;
    viewMode: "participant" | "admin";
  };
  conversation: any;
  participants: any[];
  isAnonymous: boolean;
};

export const useSessionInteractions = ({
  currentConversationId,
  sessionState,
  conversation,
  participants,
  isAnonymous
}: UseSessionInteractionsProps) => {
  // Set up message sending functionality
  const {
    isWaitingForResponse,
    handleSendMessage,
    error
  } = useMessageSender({
    currentConversationId,
    sessionState,
    participants,
    isAnonymous,
    conversation
  });

  // Set up real-time message subscription
  useMessageRealtime({
    currentConversationId,
    viewMode: sessionState.viewMode,
    setMessages: sessionState.setMessages
  });

  // Set up message likes functionality
  const { handleLikeMessage } = useMessageLikes({
    currentParticipant: sessionState.currentParticipant,
    setMessages: sessionState.setMessages
  });

  return {
    isWaitingForResponse,
    handleSendMessage,
    handleLikeMessage,
    error
  };
};
