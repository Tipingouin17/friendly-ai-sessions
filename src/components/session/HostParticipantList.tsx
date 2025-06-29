
import React from 'react';
import { ParticipantInfo, Message } from "@/types/chat";
import BaseParticipantList from "@/components/session/participant/BaseParticipantList";

interface HostParticipantListProps {
  participants: ParticipantInfo[];
  currentParticipantCount: number;
  maxParticipants: number;
  isLoading: boolean;
  conversationData: any;
  messages?: Message[];
  onSendMessage?: (message: string, isPinned: boolean, recipientId?: string) => void;
}

const HostParticipantList: React.FC<HostParticipantListProps> = (props) => {
  return (
    <BaseParticipantList
      {...props}
      title="Participants"
      showMessageInput={true}
    />
  );
};

export default HostParticipantList;
