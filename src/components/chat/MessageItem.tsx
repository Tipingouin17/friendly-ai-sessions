/**
 * MessageItem — Responsive redesign
 *
 * - No isMobile branching — pure CSS responsive
 * - Consistent avatar size and spacing
 * - isCurrentUser detection passed down to MessageBubble
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Message, ParticipantInfo } from '@/types/chat';
import MessageAvatar from './MessageAvatar';
import MessageBubble from './MessageBubble';

interface MessageItemProps {
  message: Message & { displayName?: string };
  isFirstMessageOfGroup: boolean;
  isLastMessageOfGroup: boolean;
  currentParticipant?: string;
  participantInfo?: ParticipantInfo | null;
  isMobile?: boolean; // kept for API compat
}

const MessageItem = ({
  message,
  isFirstMessageOfGroup,
  isLastMessageOfGroup,
  currentParticipant,
  participantInfo,
}: MessageItemProps) => {
  const isAnonymous = message.isAnonymous && message.sender === "user";

  let displayParticipantName =
    message.displayName ||
    (isAnonymous ? "Anonymous participant" :
      participantInfo?.name ||
      (typeof message.participant === 'string' ? message.participant : "Participant"));

  if (displayParticipantName.startsWith("Participant") && participantInfo?.name) {
    displayParticipantName = participantInfo.name;
  }

  const isCurrentUser =
    !!(currentParticipant && message.participant === currentParticipant && !isAnonymous);

  if (isCurrentUser) {
    displayParticipantName = "You";
  }

  const isLeft = message.sender === "assistant" || message.sender === "admin";

  // Admin messages are always centered
  if (message.sender === "admin") {
    return (
      <div className={cn(isFirstMessageOfGroup ? "mt-4" : "mt-1")}>
        <MessageBubble
          content={message.content}
          sender={message.sender}
          isReport={message.isReport}
          participantName={displayParticipantName}
          backgroundColor={message.color}
          isFirstMessageOfGroup={isFirstMessageOfGroup}
          isAnonymous={isAnonymous}
          isCurrentUser={isCurrentUser}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isLeft ? "justify-start" : "justify-end",
        isFirstMessageOfGroup ? "mt-4" : "mt-1"
      )}
    >
      {/* Left avatar (facilitator) */}
      {isLeft && (
        <div className={cn("shrink-0", isFirstMessageOfGroup ? "visible" : "invisible")}>
          <MessageAvatar
            avatarUrl={message.avatar}
            name={message.sender === "admin" ? "Admin" : "Facilitator"}
            size="md"
            isAssistant={message.sender === "assistant"}
            isAdmin={message.sender === "admin"}
          />
        </div>
      )}

      {/* Bubble */}
      <MessageBubble
        content={message.content}
        sender={message.sender}
        isReport={message.isReport}
        participantName={displayParticipantName}
        backgroundColor={message.color}
        isFirstMessageOfGroup={isFirstMessageOfGroup}
        isAnonymous={isAnonymous}
        isCurrentUser={isCurrentUser}
      />

      {/* Right avatar (participant) */}
      {!isLeft && (
        <div className={cn("shrink-0", isFirstMessageOfGroup ? "visible" : "invisible")}>
          {isAnonymous ? (
            <MessageAvatar anonymized name="Anonymous" size="md" />
          ) : (
            <MessageAvatar
              avatarUrl={participantInfo?.avatar}
              name={participantInfo?.name || displayParticipantName}
              size="md"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default MessageItem;
