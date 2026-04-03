/**
 * Message List
 *
 * Renders the ordered list of chat messages with smart auto-scroll.
 * Auto-scroll only activates when the user is already near the bottom;
 * if the user has scrolled up to read history, it is suppressed and a
 * "↓ New messages" button is shown instead.
 */

import React, { useMemo } from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import { getParticipantColor } from '@/utils/sessionHelpers';
import MessageItem from './MessageItem';
import ThinkingIndicator from './ThinkingIndicator';
import WaitingForResponsesIndicator from './WaitingForResponsesIndicator';
import { useScrollToBottom } from '@/hooks/useScrollToBottom';
import { MessagesSquare, ArrowDown } from 'lucide-react';

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
  participantColors = {},
  currentParticipant,
  isWaitingForResponse = false,
  isWaitingForResponses = false,
  responseCount = 0,
  totalParticipants = 1,
  participants = [],
  isMobile = false,
  conversationData
}: MessageListProps) => {
  // Smart auto-scroll: only fires when the user is near the bottom.
  // isNearBottom is used to show/hide the "New messages" jump button.
  const { ref, scrollToBottom, isNearBottom } = useScrollToBottom<HTMLDivElement>(
    [messages, isWaitingForResponse, isWaitingForResponses]
  );

  // Memoize processed messages to avoid unnecessary re-renders
  const processedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    
    return messages.map((message, index) => {
      if (!message) return null;
      
      const isFirstMessageOfGroup = index === 0 || 
        messages[index - 1]?.sender !== message.sender || 
        messages[index - 1]?.participant !== message.participant;
      
      const isLastMessageOfGroup = index === messages.length - 1 || 
        messages[index + 1]?.sender !== message.sender || 
        messages[index + 1]?.participant !== message.participant;

      // Assign participant colour for user messages
      let messageColor = message.color;
      if (message.sender === 'user' && message.participant && !messageColor) {
        messageColor = participantColors[message.participant] || getParticipantColor(message.participant);
      } else if (message.sender === 'assistant' && !messageColor) {
        messageColor = '#FFFFFF';
      }

      // Use the facilitator's profile picture for assistant messages
      let messageAvatar = message.avatar;
      if (message.sender === 'assistant') {
        if (conversationData?.sessions?.facilitator_details?.profile_picture) {
          messageAvatar = conversationData.sessions.facilitator_details.profile_picture;
        } else if (!messageAvatar || messageAvatar === '/api/avatar?name=Facilitator&variant=beam&palette=2') {
          messageAvatar = '/api/avatar?name=Facilitator&variant=beam&palette=2';
        }
      }

      // Resolve participant info for user messages
      let participantInfo = null;
      if (message.sender === 'user' && message.participant) {
        const participantNumber = parseInt(message.participant, 10);
        if (!isNaN(participantNumber)) {
          participantInfo = participants.find(p => p.id === participantNumber) ?? (
            participantNumber > 0
              ? { id: participantNumber, name: `Participant ${participantNumber}`, avatar: null }
              : null
          );
        }
      }

      return {
        message: { ...message, color: messageColor, avatar: messageAvatar },
        isFirstMessageOfGroup,
        isLastMessageOfGroup,
        participantInfo
      };
    }).filter(Boolean);
  }, [messages, participantColors, participants, conversationData]);

  // Empty state
  if (processedMessages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
        <div className="mb-3 p-3 bg-gray-50 rounded-full">
          <MessagesSquare className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-base font-medium mb-1">No messages yet</p>
        <p className="text-sm">When the session begins, messages will appear here.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div className="h-full overflow-y-auto overscroll-contain pb-20">
        <div className="px-3 py-3 sm:px-4 sm:py-4 space-y-1 sm:space-y-2">
          {processedMessages.map(({ message, isFirstMessageOfGroup, isLastMessageOfGroup, participantInfo }, index) => (
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

          {/* Waiting for participant responses */}
          {isWaitingForResponses && totalParticipants > 1 && (
            <div className="py-1">
              <WaitingForResponsesIndicator 
                currentResponses={responseCount}
                totalParticipants={totalParticipants}
                isMobile={isMobile}
              />
            </div>
          )}

          {/* AI thinking indicator */}
          {isWaitingForResponse && (
            <div className="py-1">
              <ThinkingIndicator />
            </div>
          )}

          {/* Sentinel element — the scroll hook attaches its ref here */}
          <div ref={ref} className="h-4" />
        </div>
      </div>

      {/* "New messages" jump button — only visible when the user has scrolled up */}
      {!isNearBottom && (
        <button
          onClick={scrollToBottom}
          aria-label="Scroll to latest messages"
          className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-indigo-700 transition-colors z-10"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          New messages
        </button>
      )}
    </div>
  );
};

export default React.memo(MessageList);
