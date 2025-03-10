
import React from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import MessageList from '@/components/chat/MessageList';
import SessionJoinInfo from '@/components/session/SessionJoinInfo';

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
  conversationId,
  currentParticipantCount,
  maxParticipants,
  isMobile
}) => {
  return (
    <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
      <div className="flex-1 overflow-hidden order-2 sm:order-1">
        <MessageList 
          messages={messages} 
          participantColors={participantColors}
          currentParticipant={`P${currentParticipant}`}
          onLikeMessage={onLikeMessage}
          isWaitingForResponse={isWaitingForResponse}
          participants={participants}
        />
      </div>
      
      {/* Only show the participant count for participant view and on non-mobile */}
      {!isMobile && (
        <div className="w-32 p-2 flex-shrink-0 border-l border-gray-100 order-1 sm:order-2">
          <SessionJoinInfo 
            conversationId={conversationId} 
            currentParticipantCount={currentParticipantCount}
            maxParticipants={maxParticipants}
          />
        </div>
      )}
    </div>
  );
};

export default ParticipantMessagingView;
