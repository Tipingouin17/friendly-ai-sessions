
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
  
  // Determine display name - prioritize participantInfo, then message.participant
  let displayParticipantName = isAnonymous ? "Anonymous participant" : 
                              participantInfo?.name || 
                              (typeof message.participant === 'string' ? message.participant : "Participant");
  
  // Ensure we don't display "Participant X" if we have a real name
  if (displayParticipantName.startsWith("Participant") && participantInfo?.name) {
    displayParticipantName = participantInfo.name;
  }
  
  // Log participant info for debugging
  React.useEffect(() => {
    if (isFirstMessageOfGroup) {
      console.log("MessageItem - Rendering message:", {
        content: message.content?.substring(0, 20) + "...",
        from: displayParticipantName,
        participantInfo,
        messageParticipant: message.participant
      });
    }
  }, [isFirstMessageOfGroup, displayParticipantName, participantInfo, message]);

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
              name={participantInfo?.name || displayParticipantName} 
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
