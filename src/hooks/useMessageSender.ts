
import { useState, useCallback, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";
import { participantColors } from "@/utils/sessionHelpers";
import { nanoid } from "nanoid";

type UseMessageSenderProps = {
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
  participants: any[];
  isAnonymous: boolean;
  conversation: any;
};

export const useMessageSender = ({
  currentConversationId,
  sessionState,
  participants,
  isAnonymous,
  conversation
}: UseMessageSenderProps) => {
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const requestInProgressRef = useRef(false);
  
  const handleSendMessage = useCallback(async () => {
    // Prevent concurrent requests
    if (requestInProgressRef.current || isWaitingForResponse) {
      console.log("Request already in progress, ignoring duplicate send");
      return;
    }
    
    // Don't allow sending in admin view
    if (sessionState.viewMode === "admin") return;
    
    if (!sessionState.inputMessage.trim() || !currentConversationId) return;

    // Get the current participant info
    const currentParticipant = sessionState.currentParticipant;
    const currentParticipantKey = `P${currentParticipant}`;
    const participantInfo = participants.find(p => p.id === currentParticipant);
    
    console.log("Sending message with participant info:", {
      currentParticipant,
      currentParticipantKey,
      participantInfo,
      message: sessionState.inputMessage
    });
    
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

    console.log("Adding new message to UI:", newMessage);

    // Add the participant's message to the displayed messages
    sessionState.setMessages(prev => [...prev, newMessage]);
    
    try {
      requestInProgressRef.current = true;
      
      // Clear the input message immediately to prevent duplicate sends
      sessionState.setInputMessage("");
      
      // Record this participant has responded - after adding the message
      sessionState.recordResponse(currentParticipant, true);
      
      // Store message in database for sync
      const { data, error: dbError } = await supabase.from('messages').insert({
        conversation_id: currentConversationId,
        content: sessionState.inputMessage,
        role: 'user',
        participant_id: currentParticipant,
        name: participantInfo?.name || `Participant ${currentParticipant}`,
        user_id: null, // For anonymous participants
        is_anonymous: isAnonymous
      }).select();
      
      if (dbError) {
        console.error("Error saving message to database:", dbError);
        throw new Error(dbError.message);
      }
      
      console.log("Message saved to database:", data);
      
      // For single participant sessions, immediately trigger AI response
      // Also trigger if all participants have answered
      const totalParticipants = conversation?.participants ?? 1;
      const updatedTotalResponses = sessionState.totalResponses + 1;
      
      console.log("Total expected participants:", totalParticipants);
      console.log("Current total responses:", updatedTotalResponses);
      console.log("Total participants vs responses:", totalParticipants, updatedTotalResponses);
      
      // Always get AI response if either:
      // 1. This is the only participant (totalParticipants == 1)
      // 2. All participants have now responded
      if (totalParticipants <= 1 || updatedTotalResponses >= totalParticipants) {
        setIsWaitingForResponse(true);

        try {
          console.log('Calling edge function for facilitator response');

          const response = await supabase.functions.invoke('handle-facilitator-response', {
            body: {
              messages: sessionState.messages,
              conversationId: currentConversationId
            }
          });

          if (response.error) {
            console.error('Error from edge function:', response.error);
            throw new Error(response.error.message || 'Failed to get AI response');
          }
          
          if (!response.data) {
            console.error('No response data received from AI');
            throw new Error('No response data received from AI');
          }

          const aiResponse = {
            id: response.data.id || nanoid(),
            content: response.data.content,
            sender: "assistant" as const,
            timestamp: new Date(),
            avatar: conversation?.sessions?.facilitator_details?.profile_picture || null
          };
          
          console.log("Got AI response:", aiResponse);
          
          // Save AI response to database
          try {
            await supabase.from('messages').insert({
              conversation_id: currentConversationId,
              content: aiResponse.content,
              role: 'assistant',
              user_id: null
            });
            
            console.log("AI response saved to database");
          } catch (error) {
            console.error("Error saving AI response to database:", error);
            setError("Failed to save AI response. Please try again.");
          }
          
          // Add the AI response to the messages
          sessionState.setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
          console.error('Error getting AI response:', error);
          const errorMessage = error instanceof Error ? error.message : "Failed to get facilitator's response. Please try again.";
          setError(errorMessage);
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setIsWaitingForResponse(false);
        }
      }
    } catch (error) {
      console.error("Error saving message to database:", error);
      setError("Failed to save message. Please try again.");
      toast({
        title: "Error sending message",
        description: "Failed to save message. Please try again.",
        variant: "destructive",
      });
    } finally {
      requestInProgressRef.current = false;
    }
  }, [
    isWaitingForResponse, 
    sessionState, 
    currentConversationId, 
    participants, 
    isAnonymous, 
    conversation?.participants,
    conversation?.sessions?.facilitator_details?.profile_picture,
    toast
  ]);

  return {
    isWaitingForResponse,
    handleSendMessage,
    error
  };
};
