
import React from 'react';
import MessageList from "@/components/chat/MessageList";
import SessionJoinInfo from "@/components/session/SessionJoinInfo";
import { Message, ParticipantInfo } from "@/types/chat";

interface MessagingAreaProps {
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

const MessagingArea = ({
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
}: MessagingAreaProps) => {
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

export default MessagingArea;
