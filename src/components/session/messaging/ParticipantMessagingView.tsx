
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
  // Log messages for debugging - removed excessive logging that could cause rerenders
  useEffect(() => {
    console.log("ParticipantMessagingView - Current participant:", `P${currentParticipant}`);
  }, [currentParticipant]);
  
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
