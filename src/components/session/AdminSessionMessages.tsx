
import React, { useEffect, useState } from 'react';
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
  conversationId?: number | null;
  onSessionStarted?: () => void;
}

const AdminSessionMessages: React.FC<AdminSessionMessagesProps> = ({
  messages,
  isLoading,
  participants,
  conversationData,
  onSendMessage,
  conversationId,
  onSessionStarted
}) => {
  // State for search and filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [showAnonymous, setShowAnonymous] = useState(true);

  // Debug log messages when they change
  useEffect(() => {
    console.log("AdminSessionMessages received messages:", messages.length);
  }, [messages]);

  // Generate participant colors mapping
  const participantColors = participants.reduce((colors, participant) => {
    colors[`P${participant.id}`] = getParticipantColor(`P${participant.id}`);
    return colors;
  }, {} as { [key: string]: string });

  if (isLoading) {
    return <AdminMessageLoadingState />;
  }

  // Check if session has started and if there are messages
  const sessionStarted = conversationData?.session_started;
  const hasWelcomeMessage = conversationData?.sessions?.welcome_message;

  if (messages.length === 0) {
    return (
      <AdminMessageEmptyState 
        conversationData={conversationData}
        conversationId={conversationId}
        participants={participants}
        onSessionStarted={onSessionStarted}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <AdminMessageView
          messages={messages}
          participantColors={participantColors}
          participants={participants}
          currentParticipantCount={participants.length}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showAnonymous={showAnonymous}
          setShowAnonymous={setShowAnonymous}
        />
      </div>
      
      <AdminMessageInput 
        onSendMessage={onSendMessage}
        participants={participants}
      />
    </div>
  );
};

export default AdminSessionMessages;
