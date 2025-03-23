
import React from 'react';
import { cn } from '@/lib/utils';
import { Message, ParticipantInfo } from '@/types/chat';
import MessageAvatar from './MessageAvatar';
import MessageBubble from './MessageBubble';

interface MessageItemProps {
  message: Message;
  isFirstMessageOfGroup: boolean;
  isLastMessageOfGroup: boolean;
  currentParticipant?: string;
  participantInfo?: ParticipantInfo | null;
  isMobile?: boolean;
}

const MessageItem = ({
  message,
  isFirstMessageOfGroup,
  isLastMessageOfGroup,
  currentParticipant,
  participantInfo,
  isMobile = false
}: MessageItemProps) => {
  // Handle anonymous messages
  const isAnonymous = message.isAnonymous && message.sender === "user";
  
  // Determine display name - prioritize participantInfo, then message.participant
  let displayParticipantName = isAnonymous ? "Anonymous participant" : 
                              participantInfo?.name || 
                              (typeof message.participant === 'string' ? message.participant : "Participant");
  
  // Ensure we don't display "Participant X" if we have a real name
  if (displayParticipantName.startsWith("Participant") && participantInfo?.name) {
    displayParticipantName = participantInfo.name;
  }
  
  // Special handling for "You"
  if (currentParticipant && message.participant === currentParticipant && !isAnonymous) {
    displayParticipantName = "You";
  }

  // Use more compact layout on mobile
  const spacing = isMobile ? "mt-1" : "mt-1.5";
  const groupSpacing = isMobile ? "mt-2" : "mt-3";

  return (
    <div
      className={cn(
        "flex group",
        message.sender === "assistant" ? "justify-start" : "justify-end",
        !isFirstMessageOfGroup && spacing,
        isFirstMessageOfGroup && groupSpacing
      )}
    >
      <div className="flex items-end gap-1.5 max-w-full">
        {/* Show avatar for facilitator messages */}
        {message.sender === "assistant" && (
          <div className="mb-1">
            <MessageAvatar 
              avatarUrl={message.avatar} 
              name="Facilitator" 
              size={isMobile ? "sm" : "md"}
              isAssistant={true}
            />
          </div>
        )}
        
        {/* Message bubble */}
        <MessageBubble 
          content={message.content}
          sender={message.sender}
          isReport={message.isReport}
          participantName={displayParticipantName}
          backgroundColor={message.color}
          isFirstMessageOfGroup={isFirstMessageOfGroup}
          isAnonymous={isAnonymous}
          isMobile={isMobile}
        />
        
        {/* Show avatar for user messages (not anonymous) */}
        {message.sender === "user" && !isAnonymous && (
          <div className="mb-1">
            <MessageAvatar 
              avatarUrl={participantInfo?.avatar} 
              name={participantInfo?.name || displayParticipantName} 
              size={isMobile ? "sm" : "md"}
            />
          </div>
        )}
        
        {/* Show anonymized avatar */}
        {message.sender === "user" && isAnonymous && (
          <div className="mb-1">
            <MessageAvatar 
              anonymized={true}
              name="Anonymous"
              size={isMobile ? "sm" : "md"}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
