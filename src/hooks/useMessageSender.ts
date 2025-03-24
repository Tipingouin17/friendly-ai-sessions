
import { useState, useCallback, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";
import { participantColors } from "@/utils/sessionHelpers";
import { nanoid } from "nanoid";
import { getFacilitatorAvatarUrl } from "@/utils/facilitatorUtils";

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
    if (requestInProgressRef.current || isWaitingForResponse) {
      console.log("Request already in progress, ignoring duplicate send");
      return;
    }
    
    if (sessionState.viewMode === "admin") return;
    
    if (!sessionState.inputMessage.trim() || !currentConversationId) return;

    const currentParticipant = sessionState.currentParticipant;
    const currentParticipantKey = `P${currentParticipant}`;
    const participantInfo = participants.find(p => p.id === currentParticipant);
    
    console.log("Sending message with participant info:", {
      currentParticipant,
      currentParticipantKey,
      participantInfo,
      message: sessionState.inputMessage
    });
    
    try {
      requestInProgressRef.current = true;
      
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

      sessionState.setMessages(prev => [...prev, newMessage]);
      const sentMessage = sessionState.inputMessage;
      sessionState.setInputMessage("");
      
      sessionState.recordResponse(currentParticipant, true);
      
      const { data, error: dbError } = await supabase.from('messages').insert({
        conversation_id: currentConversationId,
        content: {
          text: sentMessage,
          participant_id: currentParticipant,
          name: participantInfo?.name || `Participant ${currentParticipant}`,
          is_anonymous: isAnonymous
        },
        role: 'user',
        name: participantInfo?.name || `Participant ${currentParticipant}`
      }).select();
      
      if (dbError) {
        console.error("Error saving message to database:", dbError);
        throw new Error(dbError.message);
      }
      
      console.log("Message saved to database:", data);
      
      const totalParticipants = conversation?.participants ?? 1;
      const updatedTotalResponses = sessionState.totalResponses + 1;
      
      console.log("Total expected participants:", totalParticipants);
      console.log("Current total responses:", updatedTotalResponses);
      console.log("Single participant check:", totalParticipants <= 1);
      console.log("All participants responded check:", updatedTotalResponses >= totalParticipants);
      
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

          let avatarUrl = response.data.avatar;
          console.log('Avatar URL from response:', avatarUrl);
          
          // Normalize avatar URL to avoid double slashes
          if (avatarUrl && typeof avatarUrl === 'string') {
            avatarUrl = avatarUrl.replace(/([^:])\/\//g, '$1/');
          }
          
          if (!avatarUrl && conversation?.sessions?.facilitator_details?.profile_picture) {
            if (conversation.sessions.facilitator_details.id) {
              avatarUrl = await getFacilitatorAvatarUrl(conversation.sessions.facilitator_details);
              console.log('Using facilitator profile from conversation with ID:', avatarUrl);
            } else {
              // Normalize the URL right away to avoid issues later
              let picUrl = conversation.sessions.facilitator_details.profile_picture;
              if (picUrl && typeof picUrl === 'string') {
                picUrl = picUrl.replace(/([^:])\/\//g, '$1/');
              }
              avatarUrl = await getFacilitatorAvatarUrl({
                profile_picture: picUrl,
                title: conversation.sessions.facilitator_details.title
              });
              console.log('Using facilitator profile from conversation:', avatarUrl);
            }
          }

          const aiResponse = {
            id: response.data.id || nanoid(),
            content: response.data.content,
            sender: "assistant" as const,
            timestamp: new Date(),
            avatar: avatarUrl
          };
          
          console.log("Got AI response with avatar:", aiResponse.avatar);
          
          try {
            await supabase.from('messages').insert({
              conversation_id: currentConversationId,
              content: {
                text: aiResponse.content,
                avatar: avatarUrl
              },
              role: 'assistant',
              user_id: null
            });
            
            console.log("AI response saved to database with avatar");
            
            sessionState.setMessages(prev => [...prev, aiResponse]);
          } catch (error) {
            console.error("Error saving AI response to database:", error);
            setError("Failed to save AI response. Please try again.");
          }
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
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
      toast({
        title: "Error sending message",
        description: "Failed to send message. Please try again.",
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
    conversation?.sessions?.facilitator_details?.id,
    toast
  ]);

  return {
    isWaitingForResponse,
    handleSendMessage,
    error
  };
};
