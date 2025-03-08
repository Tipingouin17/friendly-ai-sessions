
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";
import { participantColors } from "@/utils/sessionHelpers";

type UseSessionInteractionsProps = {
  currentConversationId: number | null;
  sessionState: {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    inputMessage: string;
    setInputMessage: (message: string) => void;
    participantMessages: { [key: string]: string };
    setParticipantMessages: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
    currentParticipant: number;
    setCurrentParticipant: (num: number) => void;
  };
  conversation: any;
  participants: any[];
};

export const useSessionInteractions = ({
  currentConversationId,
  sessionState,
  conversation,
  participants
}: UseSessionInteractionsProps) => {
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!sessionState.inputMessage.trim() || !currentConversationId) return;

    const currentParticipantKey = `P${sessionState.currentParticipant}`;
    sessionState.setParticipantMessages(prev => ({
      ...prev,
      [currentParticipantKey]: sessionState.inputMessage
    }));

    const updatedMessages = {
      ...sessionState.participantMessages,
      [currentParticipantKey]: sessionState.inputMessage
    };
    const totalParticipants = conversation?.participants ?? 1;
    const allParticipantsResponded = Object.keys(updatedMessages).length >= totalParticipants;

    if (allParticipantsResponded) {
      const participantResponses = Object.entries(updatedMessages).map(([participant, content], index) => {
        const participantNumber = parseInt(participant.slice(1));
        const participantInfo = participants.find(p => p.id === participantNumber);
        
        return {
          id: Date.now().toString() + index,
          content,
          sender: "user" as const,
          participant,
          timestamp: new Date(),
          color: participantColors[participant as keyof typeof participantColors],
          avatar: participantInfo?.avatar
        };
      });

      sessionState.setMessages(prev => [...prev, ...participantResponses]);
      setIsWaitingForResponse(true);

      try {
        console.log('Calling edge function with:', {
          conversationId: currentConversationId,
          messages: [...sessionState.messages, ...participantResponses]
        });

        const response = await supabase.functions.invoke('handle-facilitator-response', {
          body: {
            messages: [...sessionState.messages, ...participantResponses],
            conversationId: currentConversationId
          }
        });

        console.log('Edge function response:', response);

        if (response.error) throw new Error(response.error.message || 'Failed to get AI response');
        if (!response.data) throw new Error('No response data received from AI');

        const aiResponse = {
          id: response.data.id || Date.now().toString(),
          content: response.data.content,
          sender: "assistant" as const,
          timestamp: new Date(),
          avatar: conversation?.sessions?.facilitator_details?.profile_picture || null
        };
        sessionState.setMessages(prev => [...prev, aiResponse]);
      } catch (error) {
        console.error('Error getting AI response:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to get facilitator's response. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsWaitingForResponse(false);
      }

      sessionState.setParticipantMessages({});
    } else {
      const nextParticipant = sessionState.currentParticipant < totalParticipants ? 
        sessionState.currentParticipant + 1 : 1;
      sessionState.setCurrentParticipant(nextParticipant);
    }

    sessionState.setInputMessage("");
  };

  const handleLikeMessage = (messageId: string) => {
    const currentParticipantId = `P${sessionState.currentParticipant}`;
    
    sessionState.setMessages(prev => 
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
  };

  return {
    isWaitingForResponse,
    handleSendMessage,
    handleLikeMessage
  };
};
