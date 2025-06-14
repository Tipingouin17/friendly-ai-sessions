
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
  conversationData?: any; // Added to pass facilitator info
}

const MessageList = ({ 
  messages, 
  participantColors = {},
  currentParticipant,
  isWaitingForResponse = false,
  participants = [],
  isMobile = false,
  conversationData
}: MessageListProps) => {
  const { ref, scrollToBottom } = useScrollToBottom<HTMLDivElement>([messages, isWaitingForResponse]);
  
  // Additional effect to scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);
  
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
        messageColor = "#FFFFFF"; // Default color for assistant messages
      }

      // Set facilitator avatar from conversation data if not already set
      let messageAvatar = message.avatar;
      if (message.sender === "assistant" && (!messageAvatar || messageAvatar === '/api/avatar?name=Facilitator&variant=beam&palette=2')) {
        // Use facilitator profile picture from conversation data
        if (conversationData?.sessions?.facilitator_details?.profile_picture) {
          messageAvatar = conversationData.sessions.facilitator_details.profile_picture;
        }
      }

      // Get participant info if this is a user message
      let participantInfo = null;
      if (message.sender === "user" && message.participant && message.participant.startsWith('P')) {
        const participantNumber = parseInt(message.participant.slice(1));
        participantInfo = participants.find(p => p.id === participantNumber);
        
        // If we couldn't find participant info, create a basic placeholder
        if (!participantInfo && participantNumber > 0) {
          participantInfo = {
            id: participantNumber,
            name: `Participant ${participantNumber}`,
            avatar: null
          };
        }
      }

      return {
        message: {...message, color: messageColor, avatar: messageAvatar},
        isFirstMessageOfGroup,
        isLastMessageOfGroup,
        participantInfo
      };
    }).filter(Boolean); // Filter out any null entries
  }, [messages, participantColors, participants, conversationData]);

  // Empty state for no messages
  if (processedMessages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
        <div className="mb-3 p-3 bg-gray-50 rounded-full">
          <MessagesSquare className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-base font-medium mb-1">No messages yet</p>
        <p className="text-sm">
          When the session begins, messages will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto overscroll-contain pb-20">
      <div className="px-3 py-6 sm:px-4 sm:py-8 space-y-1 sm:space-y-2">
        {processedMessages.map(({message, isFirstMessageOfGroup, isLastMessageOfGroup, participantInfo}, index) => (
          <MessageItem
            key={`${message.id || index}-${index}`}
            message={message}
            isFirstMessageOfGroup={true} // Always show avatar for each message for now
            isLastMessageOfGroup={isLastMessageOfGroup}
            currentParticipant={currentParticipant}
            participantInfo={participantInfo}
            isMobile={isMobile}
          />
        ))}
        
        {/* Thinking indicator */}
        {isWaitingForResponse && (
          <div className="py-1">
            <ThinkingIndicator />
          </div>
        )}
        
        <div ref={ref} className="h-4" />
      </div>
    </div>
  );
};

export default React.memo(MessageList);
