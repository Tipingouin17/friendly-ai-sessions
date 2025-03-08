
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
    participantMessages: { [key: string]: string };
    currentParticipant: number;
    setCurrentParticipant: (num: number) => void;
    isRecording: boolean;
    setIsRecording: (isRecording: boolean) => void;
    handleGenerateReport: () => Promise<void>;
    isGeneratingReport: boolean;
    setParticipantMessages: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  };
  participants: ParticipantInfo[];
  participantColors: { [key: string]: string };
  isWaitingForResponse: boolean;
  handleStartSession: () => void;
  handleSendMessage: () => Promise<void>;
  handleLikeMessage: (messageId: string) => void;
  showQrCodeView: boolean;
  sessionLink: string;
}
