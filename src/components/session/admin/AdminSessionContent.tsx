
import React from "react";
import SimplifiedAdminMessagingView from "@/components/session/messaging/SimplifiedAdminMessagingView";
import ParticipantMessagingView from "@/components/session/messaging/ParticipantMessagingView";
import AdminParticipantList from "@/components/session/AdminParticipantList";
import { Message, ParticipantInfo } from "@/types/chat";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminSessionContentProps {
  sessionMessages: Message[];
  participantColors: { [key: string]: string };
  conversationData: any;
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

const AdminSessionContent: React.FC<AdminSessionContentProps> = ({
  sessionMessages,
  participantColors,
  conversationData,
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
  const isMobile = useIsMobile();

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Messages area - split view for admin monitoring and participant interaction */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Admin monitoring view */}
        <div className="flex-1 overflow-hidden border-b border-gray-200">
          <div className="h-full">
            <SimplifiedAdminMessagingView
              messages={sessionMessages || []}
              participantColors={participantColors}
              currentParticipantCount={conversationData?.current_participants || 0}
              conversationData={conversationData}
            />
          </div>
        </div>

        {/* Participant interaction view */}
        <div className="h-64 border-t border-gray-200 bg-gray-50">
          <div className="p-2 bg-gray-100 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Participant Test Interface</h3>
            <p className="text-xs text-gray-500">Send messages as Participant {currentParticipant || 1}</p>
          </div>
          <div className="h-full">
            <ParticipantMessagingView
              messages={sessionMessages || []}
              participantColors={participantColors}
              currentParticipant={currentParticipant || 1}
              isWaitingForResponse={isWaitingForResponse}
              participants={participants}
              conversationId={currentConversationId}
              currentParticipantCount={conversationData?.current_participants || 0}
              maxParticipants={conversationData?.participants || 10}
              isMobile={isMobile}
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              onSendMessage={handleSendMessage}
              isRecording={false}
              setIsRecording={() => {}}
              isAnonymous={isAnonymous}
              toggleAnonymous={toggleAnonymous}
              hasAnswered={hasAnswered}
              totalResponses={totalResponses}
              viewMode="participant"
              participantNames={{}}
              currentUserParticipantId={currentParticipant}
              showResponseStats={false}
              conversationData={conversationData}
            />
          </div>
        </div>
      </div>

      {/* Participant sidebar */}
      <AdminParticipantList
        participants={participants || []}
        currentParticipantCount={conversationData?.current_participants || 0}
        maxParticipants={conversationData?.participants || 10}
        isLoading={isLoadingParticipants}
        conversationData={conversationData}
      />
    </div>
  );
};

export default AdminSessionContent;
