
import { Message, ParticipantInfo } from "@/types/chat";

export interface SessionContainerProps {
  participantCount: number;
  conversation: any;
  messages: Message[];
  inputMessage: string;
  setInputMessage: (message: string) => void;
  currentParticipant: number;
  handleSendMessage: () => void;
  isWaitingForResponse: boolean;
  onGenerateReport: () => void;
  isGeneratingReport: boolean;
  setIsRecording: (recording: boolean) => void;
  isRecording: boolean;
  participantColors: { [key: string]: string };
  participantNames: { [key: string]: string };
  participants: ParticipantInfo[];
  conversationId: number | null;
  facilitator: any;
  objective: string;
  currentParticipantCount: number;
  currentUserParticipantId: number | null;
  hasAnswered: boolean;
  totalResponses: number;
  viewMode: "participant" | "admin";
  setViewMode: (mode: "participant" | "admin") => void;
  isAdmin: boolean;
  onSendAdminMessage: (message: string) => void;
  isAnonymous: boolean;
  toggleAnonymous: () => void;
}
