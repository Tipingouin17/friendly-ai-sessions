
import React from "react";
import SimplifiedAdminMessagingView from "@/components/session/messaging/SimplifiedAdminMessagingView";
import AdminParticipantList from "@/components/session/AdminParticipantList";
import { Message, ParticipantInfo } from "@/types/chat";

interface AdminSessionContentProps {
  sessionMessages: Message[];
  participantColors: { [key: string]: string };
  conversationData: any;
  participants: ParticipantInfo[];
  isLoadingParticipants: boolean;
  currentConversationId: number | null;
}

const AdminSessionContent: React.FC<AdminSessionContentProps> = ({
  sessionMessages,
  participantColors,
  conversationData,
  participants,
  isLoadingParticipants,
  currentConversationId
}) => {
  return (
    <div className="flex-1 flex overflow-hidden bg-gray-50">
      {/* Admin monitoring view - full height */}
      <div className="flex-1 overflow-hidden bg-white m-4 mr-0 rounded-l-lg border border-r-0">
        <SimplifiedAdminMessagingView
          messages={sessionMessages || []}
          participantColors={participantColors}
          currentParticipantCount={conversationData?.current_participants || 0}
          conversationData={conversationData}
        />
      </div>

      {/* Participant sidebar */}
      <AdminParticipantList
        participants={participants || []}
        currentParticipantCount={conversationData?.current_participants || 0}
        maxParticipants={conversationData?.participants || 10}
        isLoading={isLoadingParticipants}
        conversationData={conversationData}
        messages={sessionMessages}
      />
    </div>
  );
};

export default AdminSessionContent;
