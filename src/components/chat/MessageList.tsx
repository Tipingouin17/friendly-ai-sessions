
import React, { useMemo } from 'react';
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
  
  // Log only when necessary
  React.useEffect(() => {
    console.log("MessageList - received messages count:", messages.length);
    console.log("MessageList - current participant:", currentParticipant);
  }, [messages.length, currentParticipant]);

  // Memoize processed messages to avoid unnecessary re-renders
  const processedMessages = useMemo(() => {
    return messages.map((message, index) => {
      const isFirstMessageOfGroup = index === 0 || 
        messages[index - 1].sender !== message.sender || 
        messages[index - 1].participant !== message.participant;
      
      const isLastMessageOfGroup = index === messages.length - 1 || 
        messages[index + 1].sender !== message.sender || 
        messages[index + 1].participant !== message.participant;

      // Ensure message has a color if it's a user message
      let messageColor = message.color;
      if (message.sender === "user" && message.participant && !messageColor) {
        messageColor = participantColors[message.participant] || getParticipantColor(message.participant);
      } else if (message.sender === "assistant" && !messageColor) {
        messageColor = "#FFFFFF";
      }

      // Get participant info if this is a user message
      let participantInfo = null;
      if (message.sender === "user" && message.participant && message.participant.startsWith('P')) {
        const participantNumber = parseInt(message.participant.slice(1));
        participantInfo = participants.find(p => p.id === participantNumber);
      }

      return {
        message: {...message, color: messageColor},
        isFirstMessageOfGroup,
        isLastMessageOfGroup,
        participantInfo
      };
    });
  }, [messages, participantColors, participants]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-6 space-y-4">
        {processedMessages.map(({message, isFirstMessageOfGroup, isLastMessageOfGroup, participantInfo}, index) => (
          <MessageItem
            key={message.id}
            message={message}
            isFirstMessageOfGroup={isFirstMessageOfGroup}
            isLastMessageOfGroup={isLastMessageOfGroup}
            currentParticipant={currentParticipant}
            onLikeMessage={onLikeMessage}
            participantInfo={participantInfo}
          />
        ))}
        
        {/* Thinking indicator */}
        {isWaitingForResponse && <ThinkingIndicator />}
        
        <div ref={ref} />
      </div>
    </div>
  );
};

export default React.memo(MessageList);
