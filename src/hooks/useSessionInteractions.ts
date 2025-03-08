
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";
import { participantColors } from "@/utils/sessionHelpers";
import { nanoid } from "nanoid";

type UseSessionInteractionsProps = {
  currentConversationId: number | null;
  sessionState: {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    inputMessage: string;
    setInputMessage: (message: string) => void;
    currentParticipant: number;
    recordResponse: (participantId: number, hasResponded: boolean) => void;
    totalResponses: number;
    hasAnswered: boolean;
  };
  conversation: any;
  participants: any[];
  isAnonymous: boolean;
};

export const useSessionInteractions = ({
  currentConversationId,
  sessionState,
  conversation,
  participants,
  isAnonymous
}: UseSessionInteractionsProps) => {
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!sessionState.inputMessage.trim() || !currentConversationId) return;

    // Get the current participant info
    const currentParticipant = sessionState.currentParticipant;
    const currentParticipantKey = `P${currentParticipant}`;
    const participantInfo = participants.find(p => p.id === currentParticipant);
    
    // Record this participant has responded
    sessionState.recordResponse(currentParticipant, true);
    
    // Create the message object
    const messageId = nanoid();
    const newMessage = {
      id: messageId,
      content: sessionState.inputMessage,
      sender: "user" as const,
      participant: currentParticipantKey,
      timestamp: new Date(),
      color: participantColors[currentParticipantKey as keyof typeof participantColors],
      avatar: participantInfo?.avatar,
      isAnonymous: isAnonymous
    };

    // Add the participant's message to the displayed messages
    sessionState.setMessages(prev => [...prev, newMessage]);
    
    // Check if we have responses from all participants
    const totalParticipants = conversation?.participants ?? 1;
    const allParticipantsResponded = sessionState.totalResponses >= totalParticipants;

    // If all participants have responded, send to facilitator
    if (allParticipantsResponded) {
      setIsWaitingForResponse(true);

      try {
        // Get all participant messages for this round
        const participantMessages = sessionState.messages.filter(msg => 
          msg.sender === "user" && msg.participant && msg.participant.startsWith('P')
        ).slice(-totalParticipants);
        
        console.log('Calling edge function with:', {
          conversationId: currentConversationId,
          messages: sessionState.messages
        });

        const response = await supabase.functions.invoke('handle-facilitator-response', {
          body: {
            messages: sessionState.messages,
            conversationId: currentConversationId
          }
        });

        console.log('Edge function response:', response);

        if (response.error) throw new Error(response.error.message || 'Failed to get AI response');
        if (!response.data) throw new Error('No response data received from AI');

        const aiResponse = {
          id: response.data.id || nanoid(),
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
