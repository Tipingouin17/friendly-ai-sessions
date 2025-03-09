
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
    viewMode: "participant" | "admin";
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
    // Don't allow sending in admin view
    if (sessionState.viewMode === "admin") return;
    
    if (!sessionState.inputMessage.trim() || !currentConversationId) return;

    // Get the current participant info
    const currentParticipant = sessionState.currentParticipant;
    const currentParticipantKey = `P${currentParticipant}`;
    const participantInfo = participants.find(p => p.id === currentParticipant);
    
    console.log("Sending message as participant:", currentParticipant, "with key:", currentParticipantKey);
    console.log("Current participants:", participants);
    console.log("Current participant info:", participantInfo);
    
    // Create the message object
    const messageId = nanoid();
    const newMessage = {
      id: messageId,
      content: sessionState.inputMessage,
      sender: "user" as const,
      participant: currentParticipantKey,
      timestamp: new Date(),
      color: participantColors[currentParticipantKey] || "#CCCCCC",
      avatar: participantInfo?.avatar,
      isAnonymous: isAnonymous
    };

    // Add the participant's message to the displayed messages
    sessionState.setMessages(prev => [...prev, newMessage]);
    
    // Clear the input message
    sessionState.setInputMessage("");
    
    // Record this participant has responded - after adding the message
    sessionState.recordResponse(currentParticipant, true);
    
    // Check if we have responses from all participants
    const totalParticipants = conversation?.participants ?? 1;
    const updatedTotalResponses = sessionState.totalResponses + 1;
    
    console.log("Total expected participants:", totalParticipants);
    console.log("Current total responses:", updatedTotalResponses);
    
    // If all participants have responded, send to facilitator
    if (updatedTotalResponses >= totalParticipants) {
      setIsWaitingForResponse(true);

      try {
        // Get all participant messages for this round
        const participantMessages = sessionState.messages.filter(msg => 
          msg.sender === "user" && msg.participant && msg.participant.startsWith('P')
        ).slice(-totalParticipants);
        
        console.log('Calling edge function with participant messages:', participantMessages);
        console.log('Number of messages being sent:', sessionState.messages.length);

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
