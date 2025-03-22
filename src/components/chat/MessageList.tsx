
import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import { getParticipantColor } from '@/utils/sessionHelpers';
import MessageItem from './MessageItem';
import ThinkingIndicator from './ThinkingIndicator';
import { useScrollToBottom } from '@/hooks/useScrollToBottom';
import { MessagesSquare } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  participantColors?: {[key: string]: string};
  currentParticipant?: string;
  isWaitingForResponse?: boolean;
  participants?: ParticipantInfo[];
  isMobile?: boolean;
}

const MessageList = ({ 
  messages, 
  participantColors = {},
  currentParticipant,
  isWaitingForResponse = false,
  participants = [],
  isMobile = false
}: MessageListProps) => {
  const { ref } = useScrollToBottom<HTMLDivElement>([messages, isWaitingForResponse]);
  
  // Memoize processed messages to avoid unnecessary re-renders
  const processedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    
    return messages.map((message, index) => {
      // Skip processing if message is invalid
      if (!message) return null;
      
      const isFirstMessageOfGroup = index === 0 || 
        messages[index - 1]?.sender !== message.sender || 
        messages[index - 1]?.participant !== message.participant;
      
      const isLastMessageOfGroup = index === messages.length - 1 || 
        messages[index + 1]?.sender !== message.sender || 
        messages[index + 1]?.participant !== message.participant;

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
    }).filter(Boolean); // Filter out any null entries
  }, [messages, participantColors, participants]);

  // Empty state for no messages
  if (processedMessages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4 sm:p-8">
        <div className="mb-4 p-4 bg-gray-50 rounded-full">
          <MessagesSquare className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
        </div>
        <p className="text-base sm:text-lg font-medium mb-2">No messages yet</p>
        <p className="max-w-md text-xs sm:text-sm">
          When the session begins, messages will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className={`px-3 py-3 sm:px-4 sm:py-6 space-y-2 sm:space-y-4`}>
        {processedMessages.map(({message, isFirstMessageOfGroup, isLastMessageOfGroup, participantInfo}, index) => (
          <MessageItem
            key={`${message.id || index}-${index}`}
            message={message}
            isFirstMessageOfGroup={isFirstMessageOfGroup}
            isLastMessageOfGroup={isLastMessageOfGroup}
            currentParticipant={currentParticipant}
            participantInfo={participantInfo}
            isMobile={isMobile}
          />
        ))}
        
        {/* Thinking indicator */}
        {isWaitingForResponse && (
          <div className="py-2">
            <ThinkingIndicator />
          </div>
        )}
        
        <div ref={ref} className="h-4" />
      </div>
    </div>
  );
};

export default React.memo(MessageList);
