
import { Message, ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";

export interface SessionContextProps {
  isLoading: boolean;
  conversation: ConversationWithSession | null;
  currentConversationId: number | null;
  sessionState: {
    messages: Message[];
    inputMessage: string;
    setInputMessage: (message: string) => void;
    currentParticipant: number;
    isRecording: boolean;
    setIsRecording: (isRecording: boolean) => void;
    handleGenerateReport: () => Promise<void>;
    isGeneratingReport: boolean;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    hasAnswered: boolean;
    totalResponses: number;
    viewMode: "participant" | "admin";
    setViewMode: (mode: "participant" | "admin") => void;
    recordResponse: (participantId: number, hasResponded: boolean) => void;
    error: string | null;
  };
  participants: ParticipantInfo[];
  participantColors: { [key: string]: string };
  isWaitingForResponse: boolean;
  handleStartSession: () => void;
  handleSendMessage: () => Promise<void>;
  handleLikeMessage: (messageId: string) => void;
  showQrCodeView: boolean;
  sessionLink: string;
  currentUserParticipantId: number | null;
  anonymousState: {
    isAnonymous: boolean;
    toggleAnonymous: () => void;
  };
  isSessionStartedInDB: boolean;
  error?: string | null;
}
