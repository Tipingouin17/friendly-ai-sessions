
import React from 'react';
import { Message, ParticipantInfo } from "@/types/chat";
import AdminMessageView from './messaging/AdminMessageView';
import AdminMessageLoadingState from './messaging/AdminMessageLoadingState';
import AdminMessageEmptyState from './messaging/AdminMessageEmptyState';
import AdminMessageInput from './AdminMessageInput';
import { getParticipantColor } from '@/utils/sessionHelpers';

interface AdminSessionMessagesProps {
  messages: Message[];
  isLoading: boolean;
  participants: ParticipantInfo[];
  conversationData: any;
  onSendMessage: (message: string, isPinned: boolean, recipientId?: string) => void;
}

const AdminSessionMessages: React.FC<AdminSessionMessagesProps> = ({
  messages,
  isLoading,
  participants,
  conversationData,
  onSendMessage
}) => {
  // Generate participant colors mapping
  const participantColors = participants.reduce((colors, participant) => {
    colors[`P${participant.id}`] = getParticipantColor(`P${participant.id}`);
    return colors;
  }, {} as { [key: string]: string });

  if (isLoading) {
    return <AdminMessageLoadingState />;
  }

  if (messages.length === 0) {
    return <AdminMessageEmptyState conversationData={conversationData} />;
  }

  return (
    <>
      <div className="flex-1 overflow-hidden">
        <AdminMessageView
          messages={messages}
          participants={participants}
          participantColors={participantColors}
        />
      </div>
      
      <AdminMessageInput 
        onSendMessage={onSendMessage}
        participants={participants}
      />
    </>
  );
};

export default AdminSessionMessages;
