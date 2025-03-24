
import React, { useState } from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import AdminMessagingView from './AdminMessagingView';

interface AdminMessageViewProps {
  messages: Message[];
  participants: ParticipantInfo[];
  participantColors: { [key: string]: string };
}

const AdminMessageView: React.FC<AdminMessageViewProps> = ({
  messages,
  participants,
  participantColors
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAnonymous, setShowAnonymous] = useState(true);
  
  // Log messages whenever they change for debugging
  React.useEffect(() => {
    console.log("Admin message view received messages:", messages.length);
    if (messages.length > 0) {
      console.log("First few messages:", messages.slice(0, 3).map(m => ({
        id: m.id,
        sender: m.sender,
        content: m.content.substring(0, 30) + "...",
      })));
    }
  }, [messages]);
  
  return (
    <AdminMessagingView
      messages={messages}
      participantColors={participantColors}
      currentParticipantCount={participants.length}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      showAnonymous={showAnonymous}
      setShowAnonymous={setShowAnonymous}
    />
  );
};

export default AdminMessageView;
