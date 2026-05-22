/**
 * MessageList — Responsive redesign
 *
 * Key fixes:
 * - Scroll container fills the full available height via flex layout (no overflow-hidden parent)
 * - Auto-scroll only when user is near the bottom
 * - "New messages" jump button when user has scrolled up
 * - No isMobile branching — pure CSS responsive
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
  conversationData
}: MessageListProps) => {
  const { ref, scrollToBottom, isNearBottom } = useScrollToBottom<HTMLDivElement>(
    [messages, isWaitingForResponse, isWaitingForResponses]
  );
  const speechLanguage = conversationData?.language || conversationData?.sessions?.language || null;

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

      let messageColor = message.color;
      if (message.sender === 'user' && message.participant && !messageColor) {
        messageColor = participantColors[message.participant] || getParticipantColor(message.participant);
      } else if (message.sender === 'assistant' && !messageColor) {
        messageColor = '#FFFFFF';
      }

      let messageAvatar = message.avatar;
      if (message.sender === 'assistant') {
        if (conversationData?.sessions?.facilitator_details?.profile_picture) {
          messageAvatar = conversationData.sessions.facilitator_details.profile_picture;
        } else if (!messageAvatar || messageAvatar === '/api/avatar?name=Facilitator&variant=beam&palette=2') {
          messageAvatar = '/api/avatar?name=Facilitator&variant=beam&palette=2';
        }
      }

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

  // Empty state — but if the AI is already thinking, show the thinking
  // indicator so participants never see a blank screen after joining.
  if (processedMessages.length === 0) {
    if (isWaitingForResponse) {
      return (
        <div className="flex flex-col h-full">
          <div className="px-4 py-5 sm:px-6">
            <ThinkingIndicator />
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="mb-4 w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <MessagesSquare className="w-7 h-7 text-indigo-400" />
        </div>
        <p className="text-base font-semibold text-slate-700 mb-1">No messages yet</p>
        <p className="text-sm text-slate-400 max-w-xs">
          When the session begins, the facilitator's messages will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Scrollable message area — fills full height */}
      <div className="h-full overflow-y-auto overscroll-contain scroll-smooth">
        <div className="px-4 py-5 sm:px-6 space-y-1">
          {processedMessages.map(({ message, isFirstMessageOfGroup, isLastMessageOfGroup, participantInfo }, index) => (
            <MessageItem
              key={`${message.id || index}-${index}`}
              message={message}
              isFirstMessageOfGroup={isFirstMessageOfGroup}
              isLastMessageOfGroup={isLastMessageOfGroup}
              currentParticipant={currentParticipant}
              participantInfo={participantInfo}
              speechLanguage={speechLanguage}
            />
          ))}

          {/* Waiting for participant responses */}
          {isWaitingForResponses && totalParticipants > 1 && (
            <div className="pt-2">
              <WaitingForResponsesIndicator
                currentResponses={responseCount}
                totalParticipants={totalParticipants}
              />
            </div>
          )}

          {/* AI thinking indicator */}
          {isWaitingForResponse && (
            <div className="pt-2">
              <ThinkingIndicator />
            </div>
          )}

          {/* Scroll sentinel */}
          <div ref={ref} className="h-2" />
        </div>
      </div>

      {/* "New messages" jump button */}
      {!isNearBottom && (
        <button
          onClick={scrollToBottom}
          aria-label="Scroll to latest messages"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-indigo-700 active:scale-95 transition-all z-10"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          New messages
        </button>
      )}
    </div>
  );
};

export default React.memo(MessageList);
