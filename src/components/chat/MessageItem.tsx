/**
 * Message Item
 *
 * Chat component for the AIfacilitator application.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Message, ParticipantInfo } from '@/types/chat';
import MessageAvatar from './MessageAvatar';
import MessageBubble from './MessageBubble';
import { debugLog } from '@/utils/debugLogger';

interface MessageItemProps {
  message: Message & { displayName?: string }; // Add displayName to message type
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
  // Debug log for assistant avatars
  React.useEffect(() => {
    if (message.sender === "assistant" && isFirstMessageOfGroup) {
      debugLog('all', `MessageItem - assistant message with avatar: ${message.avatar || 'No avatar provided'}`);
    }
  }, [message, isFirstMessageOfGroup]); 

  // Handle anonymous messages
  const isAnonymous = message.isAnonymous && message.sender === "user";
  
  // Use displayName from processed message if available, otherwise fall back to previous logic
  let displayParticipantName = message.displayName || 
                              (isAnonymous ? "Anonymous participant" : 
                              participantInfo?.name || 
                              (typeof message.participant === 'string' ? message.participant : "Participant"));
  
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
        (message.sender === "assistant" || message.sender === "admin") ? "justify-start" : "justify-end",
        !isFirstMessageOfGroup && spacing,
        isFirstMessageOfGroup && groupSpacing
      )}
    >
      <div className="flex items-end gap-1.5 max-w-full">
        {/* Show avatar for facilitator and admin messages */}
        {(message.sender === "assistant" || message.sender === "admin") && (
          <div className="mb-1">
            <MessageAvatar 
              avatarUrl={message.avatar} 
              name={message.sender === "admin" ? "Admin" : "Facilitator"} 
              size={isMobile ? "sm" : "md"}
              isAssistant={message.sender === "assistant"}
              isAdmin={message.sender === "admin"}
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
