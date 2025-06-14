
import React from "react";
import SimplifiedAdminHeader from "@/components/session/admin/SimplifiedAdminHeader";
import AdminSessionContent from "./AdminSessionContent";
import { Message, ParticipantInfo } from "@/types/chat";

interface AdminSessionLayoutProps {
  conversationData: any;
  exportSessionData: () => void;
  handleSendAdminMessage: (message: string) => void;
  toggleSessionState: () => void;
  isSessionPaused: boolean;
  sessionMessages: Message[];
  participantColors: { [key: string]: string };
  participants: ParticipantInfo[];
  isLoadingParticipants: boolean;
  currentParticipant: number | null;
  inputMessage: string;
  setInputMessage: (message: string) => void;
  isWaitingForResponse: boolean;
  handleSendMessage: () => void;
  isAnonymous: boolean;
  toggleAnonymous: () => void;
  hasAnswered: boolean;
  totalResponses: number;
  currentConversationId: number | null;
}

const AdminSessionLayout: React.FC<AdminSessionLayoutProps> = ({
  conversationData,
  exportSessionData,
  handleSendAdminMessage,
  toggleSessionState,
  isSessionPaused,
  sessionMessages,
  participantColors,
  participants,
  isLoadingParticipants,
  currentParticipant,
  inputMessage,
  setInputMessage,
  isWaitingForResponse,
  handleSendMessage,
  isAnonymous,
  toggleAnonymous,
  hasAnswered,
  totalResponses,
  currentConversationId
}) => {
  return (
    <div className="flex flex-col h-screen">
      {/* Simplified admin header */}
      <SimplifiedAdminHeader
        conversationData={conversationData}
        onCloseAndReport={exportSessionData}
        onSendMessage={handleSendAdminMessage}
        isGeneratingReport={false}
        participantCount={conversationData?.current_participants || 0}
        maxParticipants={conversationData?.participants || 10}
        onWrapUp={async () => {
          await toggleSessionState();
        }}
        isWrappingUp={isSessionPaused}
      />

      {/* Main content area */}
      <AdminSessionContent
        sessionMessages={sessionMessages}
        participantColors={participantColors}
        conversationData={conversationData}
        participants={participants}
        isLoadingParticipants={isLoadingParticipants}
        currentParticipant={currentParticipant}
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        isWaitingForResponse={isWaitingForResponse}
        handleSendMessage={handleSendMessage}
        isAnonymous={isAnonymous}
        toggleAnonymous={toggleAnonymous}
        hasAnswered={hasAnswered}
        totalResponses={totalResponses}
        currentConversationId={currentConversationId}
      />
    </div>
  );
};

export default AdminSessionLayout;
