
import React, { useEffect, useState } from 'react';
import { Message, ParticipantInfo } from "@/types/chat";
import AdminMessageView from './messaging/AdminMessageView';
import AdminMessageLoadingState from './messaging/AdminMessageLoadingState';
import AdminMessageEmptyState from './messaging/AdminMessageEmptyState';
import AdminMessageInput from './AdminMessageInput';
import { getParticipantColor } from '@/utils/sessionHelpers';
import AdminDashboard from './admin/AdminDashboard';

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

  // Special case: Show messages even if length is 0, in case there's a welcome message
  // but no participant responses yet
  const hasWelcomeMessage = conversationData?.sessions?.welcome_message;

  const content = messages.length === 0 && !hasWelcomeMessage ? (
    <AdminMessageEmptyState conversationData={conversationData} />
  ) : (
    <>
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
    </>
  );

  // Wrap content in the dashboard UI
  return (
    <AdminDashboard
      conversationData={conversationData}
      messages={messages}
      isSessionPaused={false} // This will be passed from parent
      toggleSessionState={() => {}} // This will be passed from parent
      handleAdminMessage={(message) => onSendMessage(message, false)}
      exportSessionData={() => {}} // This will be passed from parent
      participants={participants}
      currentParticipantCount={participants.length}
      maxParticipants={conversationData?.participants || 10}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      showAnonymous={showAnonymous}
      setShowAnonymous={setShowAnonymous}
    >
      {content}
    </AdminDashboard>
  );
};

export default AdminSessionMessages;
