
import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import { getParticipantColor } from '@/utils/sessionHelpers';
import MessageItem from './MessageItem';
import ThinkingIndicator from './ThinkingIndicator';
import WaitingForResponsesIndicator from './WaitingForResponsesIndicator';
import { useScrollToBottom } from '@/hooks/useScrollToBottom';
import { MessagesSquare } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  participantColors?: {[key: string]: string};
  currentParticipant?: string;
  isWaitingForResponse?: boolean;
  isWaitingForResponses?: boolean;
  responseCount?: number;
  totalParticipants?: number;
  participants?: ParticipantInfo[];
  isMobile?: boolean;
  conversationData?: any;
}

const MessageList = ({ 
  messages, 
  participantColors = { /* no-op */ },
  currentParticipant,
  isWaitingForResponse = false,
  isWaitingForResponses = false,
  responseCount = 0,
  totalParticipants = 1,
  participants = [],
  isMobile = false,
  conversationData
}: MessageListProps) => {
  const { ref, scrollToBottom } = useScrollToBottom<HTMLDivElement>([messages, isWaitingForResponse, isWaitingForResponses]);
  
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
        messageColor = "#FFFFFF";
      }

      // Set facilitator avatar from conversation data - FIXED
      let messageAvatar = message.avatar;
      if (message.sender === "assistant") {
        // Always use facilitator profile picture from conversation data if available
        if (conversationData?.sessions?.facilitator_details?.profile_picture) {
          messageAvatar = conversationData.sessions.facilitator_details.profile_picture;
        } else if (!messageAvatar || messageAvatar === '/api/avatar?name=Facilitator&variant=beam&palette=2') {
          // Fallback to default facilitator avatar
          messageAvatar = '/api/avatar?name=Facilitator&variant=beam&palette=2';
        }
      }

      // Get participant info if this is a user message
      let participantInfo = null;
      if (message.sender === "user" && message.participant) {
        // participant is now a plain numeric string ID (e.g. "1", "2")
        const participantNumber = parseInt(message.participant, 10);
        if (!isNaN(participantNumber)) {
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
      }

      return {
        message: {...message, color: messageColor, avatar: messageAvatar},
        isFirstMessageOfGroup,
        isLastMessageOfGroup,
        participantInfo
      };
    }).filter(Boolean);
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
      {/* Reduced padding for better spacing */}
      <div className="px-3 py-3 sm:px-4 sm:py-4 space-y-1 sm:space-y-2">
        {processedMessages.map(({message, isFirstMessageOfGroup, isLastMessageOfGroup, participantInfo}, index) => (
          <MessageItem
            key={`${message.id || index}-${index}`}
            message={message}
            isFirstMessageOfGroup={true}
            isLastMessageOfGroup={isLastMessageOfGroup}
            currentParticipant={currentParticipant}
            participantInfo={participantInfo}
            isMobile={isMobile}
          />
        ))}
        
        {/* Show waiting for responses indicator when collecting responses */}
        {isWaitingForResponses && totalParticipants > 1 && (
          <div className="py-1">
            <WaitingForResponsesIndicator 
              currentResponses={responseCount}
              totalParticipants={totalParticipants}
              isMobile={isMobile}
            />
          </div>
        )}
        
        {/* Show thinking indicator when AI is processing */}
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
