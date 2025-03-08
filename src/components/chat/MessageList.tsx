
import React from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import { getParticipantColor } from '@/utils/sessionHelpers';
import MessageItem from './MessageItem';
import ThinkingIndicator from './ThinkingIndicator';
import { useScrollToBottom } from '@/hooks/useScrollToBottom';

interface MessageListProps {
  messages: Message[];
  participantColors?: {[key: string]: string};
  currentParticipant?: string;
  onLikeMessage?: (messageId: string) => void;
  isWaitingForResponse?: boolean;
  participants?: ParticipantInfo[];
}

const MessageList = ({ 
  messages, 
  participantColors = {},
  currentParticipant,
  onLikeMessage,
  isWaitingForResponse = false,
  participants = []
}: MessageListProps) => {
  const { ref } = useScrollToBottom<HTMLDivElement>([messages, isWaitingForResponse]);
  
  console.log("MessageList - received messages:", messages);
  console.log("MessageList - current participant:", currentParticipant);

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-6 space-y-4">
        {messages.map((message, index) => {
          const isFirstMessageOfGroup = index === 0 || 
            messages[index - 1].sender !== message.sender || 
            messages[index - 1].participant !== message.participant;
          
          const isLastMessageOfGroup = index === messages.length - 1 || 
            messages[index + 1].sender !== message.sender || 
            messages[index + 1].participant !== message.participant;

          const messageColor = message.sender === "user" && message.participant
            ? (participantColors[message.participant] || getParticipantColor(message.participant))
            : message.sender === "assistant" ? "#FFFFFF" : undefined;

          // Get participant info if this is a user message
          let participantInfo = null;
          if (message.sender === "user" && message.participant && message.participant.startsWith('P')) {
            const participantNumber = parseInt(message.participant.slice(1));
            participantInfo = participants.find(p => p.id === participantNumber);
            console.log("Found participant info for message:", participantInfo);
          }

          return (
            <MessageItem
              key={message.id}
              message={{...message, color: messageColor}}
              isFirstMessageOfGroup={isFirstMessageOfGroup}
              isLastMessageOfGroup={isLastMessageOfGroup}
              currentParticipant={currentParticipant}
              onLikeMessage={onLikeMessage}
              participantInfo={participantInfo}
            />
          );
        })}
        
        {/* Thinking indicator */}
        {isWaitingForResponse && <ThinkingIndicator />}
        
        <div ref={ref} />
      </div>
    </div>
  );
};

export default MessageList;
