/**
 * Admin Participant List
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import { ParticipantInfo, Message } from "@/types/chat";
import BaseParticipantList from "@/components/session/participant/BaseParticipantList";

interface AdminParticipantListProps {
  participants: ParticipantInfo[];
  currentParticipantCount: number;
  maxParticipants: number;
  isLoading: boolean;
  conversationData: any;
  messages?: Message[];
  onSendMessage?: (message: string, isPinned: boolean, recipientId?: string) => void;
}

const AdminParticipantList: React.FC<AdminParticipantListProps> = (props) => {
  return (
    <BaseParticipantList
      {...props}
      title="Participants"
      showMessageInput={true}
    />
  );
};

export default AdminParticipantList;
