
import React, { useEffect } from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import MessageList from '@/components/chat/MessageList';

interface ParticipantMessagingViewProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipant: number;
  isWaitingForResponse?: boolean;
  onLikeMessage?: (messageId: string) => void;
  participants: ParticipantInfo[];
  conversationId: number | null;
  currentParticipantCount: number;
  maxParticipants: number;
  isMobile: boolean;
}

const ParticipantMessagingView: React.FC<ParticipantMessagingViewProps> = ({
  messages,
  participantColors,
  currentParticipant,
  isWaitingForResponse = false,
  onLikeMessage,
  participants,
  isMobile,
  conversationId
}) => {
  // Log messages for debugging
  useEffect(() => {
    console.log("ParticipantMessagingView - Rendering with messages:", 
      messages.map(m => ({
        id: m.id,
        content: m.content.substring(0, 20) + "...",
        sender: m.sender,
        participant: m.participant
      }))
    );
    console.log("ParticipantMessagingView - Current participant:", `P${currentParticipant}`);
  }, [messages, currentParticipant]);
  
  return (
    <div className="flex-1 overflow-hidden">
      <MessageList 
        messages={messages} 
        participantColors={participantColors}
        currentParticipant={`P${currentParticipant}`}
        onLikeMessage={onLikeMessage}
        isWaitingForResponse={isWaitingForResponse}
        participants={participants}
      />
    </div>
  );
};

export default ParticipantMessagingView;
