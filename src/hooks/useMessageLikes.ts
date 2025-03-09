
import { useCallback } from "react";
import { Message } from "@/types/chat";

type UseMessageLikesProps = {
  currentParticipant: number;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
};

export const useMessageLikes = ({
  currentParticipant,
  setMessages
}: UseMessageLikesProps) => {
  const handleLikeMessage = useCallback((messageId: string) => {
    const currentParticipantId = `P${currentParticipant}`;
    
    setMessages(prev => 
      prev.map(message => {
        if (message.id === messageId) {
          const currentLikes = message.likes || [];
          const alreadyLiked = currentLikes.includes(currentParticipantId);
          
          return {
            ...message,
            likes: alreadyLiked 
              ? currentLikes.filter(id => id !== currentParticipantId) 
              : [...currentLikes, currentParticipantId]
          };
        }
        return message;
      })
    );
  }, [currentParticipant, setMessages]);

  return { handleLikeMessage };
};
