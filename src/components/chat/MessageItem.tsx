
import React from 'react';
import { cn } from '@/lib/utils';
import { Message, ParticipantInfo } from '@/types/chat';
import MessageAvatar from './MessageAvatar';
import MessageLikeButton from './MessageLikeButton';
import MessageBubble from './MessageBubble';

interface MessageItemProps {
  message: Message;
  isFirstMessageOfGroup: boolean;
  isLastMessageOfGroup: boolean;
  currentParticipant?: string;
  onLikeMessage?: (messageId: string) => void;
  participantInfo?: ParticipantInfo | null;
  isMobile?: boolean;
}

const MessageItem = ({
  message,
  isFirstMessageOfGroup,
  isLastMessageOfGroup,
  currentParticipant,
  onLikeMessage,
  participantInfo,
  isMobile = false
}: MessageItemProps) => {
  const isLikedByCurrentParticipant = message.likes?.includes(currentParticipant || '');
  const likeCount = message.likes?.length || 0;
  
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

  const handleLike = () => {
    if (onLikeMessage) {
      onLikeMessage(message.id);
    }
  };

  // Use more compact layout on mobile
  const spacing = isMobile ? "mt-1" : "mt-2";
  const groupSpacing = isMobile ? "mt-2.5" : "mt-4";

  return (
    <div
      className={cn(
        "flex group",
        message.sender === "assistant" ? "justify-start" : "justify-end",
        !isFirstMessageOfGroup && spacing,
        isFirstMessageOfGroup && groupSpacing
      )}
    >
      <div className="flex items-end gap-1 sm:gap-2 max-w-full">
        {/* Show like button to the left for assistant messages */}
        {message.sender === "assistant" && (
          <MessageLikeButton 
            isLiked={!!isLikedByCurrentParticipant}
            likeCount={likeCount}
            onClick={handleLike}
          />
        )}
        
        {/* Show avatar for first message in a group */}
        {message.sender === "assistant" && isFirstMessageOfGroup && (
          <div className="mb-1 hidden sm:block">
            <MessageAvatar 
              avatarUrl={message.avatar} 
              name="Facilitator" 
              size={isMobile ? "sm" : "md"}
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
        
        {/* Show like button to the right for user messages */}
        {message.sender !== "assistant" && (
          <MessageLikeButton 
            isLiked={!!isLikedByCurrentParticipant}
            likeCount={likeCount}
            onClick={handleLike}
          />
        )}
        
        {/* Show avatar for user messages (not anonymous) */}
        {message.sender === "user" && isFirstMessageOfGroup && !isAnonymous && (
          <div className="mb-1 hidden sm:block">
            <MessageAvatar 
              avatarUrl={participantInfo?.avatar} 
              name={participantInfo?.name || displayParticipantName} 
              size={isMobile ? "sm" : "md"}
            />
          </div>
        )}
        
        {/* Show anonymized avatar */}
        {message.sender === "user" && isFirstMessageOfGroup && isAnonymous && (
          <div className="mb-1 hidden sm:block">
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
