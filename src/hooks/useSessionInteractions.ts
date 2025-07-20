
import { useMessageSender } from "./useMessageSender";
import { useMessageRealtime } from "./useMessageRealtime";
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
  // NEW: Enhanced props for host context
  isHostPage?: boolean;
  canSendMessages?: boolean;
};

export const useSessionInteractions = ({
  currentConversationId,
  sessionState,
  conversation,
  participants,
  isAnonymous,
  isHostPage = false,
  canSendMessages = true
}: UseSessionInteractionsProps) => {
  // Set up message sending functionality with enhanced host context
  const {
    isWaitingForResponse,
    isWaitingForResponses,
    responseCount,
    totalParticipants,
    currentUserHasResponded,
    handleSendMessage,
    error,
    startResponseCollection
  } = useMessageSender({
    currentConversationId,
    sessionState,
    participants,
    isAnonymous,
    conversation,
    // NEW: Pass host context
    isHostPage,
    canSendMessages
  });

  // Set up real-time message subscription
  useMessageRealtime({
    currentConversationId,
    viewMode: sessionState.viewMode,
    setMessages: sessionState.setMessages
  });

  return {
    isWaitingForResponse,
    isWaitingForResponses,
    responseCount,
    totalParticipants,
    currentUserHasResponded,
    handleSendMessage,
    error,
    startResponseCollection
  };
};
