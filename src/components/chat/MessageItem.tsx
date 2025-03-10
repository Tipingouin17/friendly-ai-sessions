
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
}

const MessageItem = ({
  message,
  isFirstMessageOfGroup,
  isLastMessageOfGroup,
  currentParticipant,
  onLikeMessage,
  participantInfo
}: MessageItemProps) => {
  const isLikedByCurrentParticipant = message.likes?.includes(currentParticipant || '');
  const likeCount = message.likes?.length || 0;
  
  // Handle anonymous messages
  const isAnonymous = message.isAnonymous && message.sender === "user";
  
  // Use participantInfo.name if available, otherwise fall back to message.participant
  // Make sure we don't display "Participant X" format strings
  let displayParticipantName = "User";
  if (isAnonymous) {
    displayParticipantName = "Anonymous participant";
  } else if (participantInfo && participantInfo.name) {
    displayParticipantName = participantInfo.name;
  } else if (message.participant && !message.participant.startsWith("Participant")) {
    displayParticipantName = message.participant;
  }

  const handleLike = () => {
    if (onLikeMessage) {
      onLikeMessage(message.id);
    }
  };

  return (
    <div
      className={cn(
        "flex group",
        message.sender === "assistant" ? "justify-start" : "justify-end",
        !isFirstMessageOfGroup && "mt-1"
      )}
    >
      <div className="flex items-end gap-2">
        {message.sender === "assistant" && (
          <MessageLikeButton 
            isLiked={!!isLikedByCurrentParticipant}
            likeCount={likeCount}
            onClick={handleLike}
          />
        )}
        
        {message.sender === "assistant" && isFirstMessageOfGroup && (
          <div className="mb-1">
            <MessageAvatar 
              avatarUrl={message.avatar} 
              name="Facilitator" 
            />
          </div>
        )}
        
        <MessageBubble 
          content={message.content}
          sender={message.sender}
          isReport={message.isReport}
          participantName={displayParticipantName}
          backgroundColor={message.color}
          isFirstMessageOfGroup={isFirstMessageOfGroup}
          isAnonymous={isAnonymous}
        />
        
        {message.sender !== "assistant" && (
          <MessageLikeButton 
            isLiked={!!isLikedByCurrentParticipant}
            likeCount={likeCount}
            onClick={handleLike}
          />
        )}
        
        {message.sender === "user" && isFirstMessageOfGroup && !isAnonymous && (
          <div className="mb-1">
            <MessageAvatar 
              avatarUrl={participantInfo?.avatar} 
              name={participantInfo?.name || "User"} 
            />
          </div>
        )}
        
        {message.sender === "user" && isFirstMessageOfGroup && isAnonymous && (
          <div className="mb-1">
            <MessageAvatar 
              anonymized={true}
              name="Anonymous"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
