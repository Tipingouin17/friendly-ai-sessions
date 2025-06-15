
import { useState, useCallback, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Message, ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";

interface UseHostMessagesProps {
  conversationId: number | null;
  participants: ParticipantInfo[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  conversationData?: ConversationWithSession | null;
}

export function useHostMessages({
  conversationId,
  participants,
  messages,
  setMessages,
  conversationData
}: UseHostMessagesProps) {
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  const [responseCount, setResponseCount] = useState(0);
  const [isWaitingForResponses, setIsWaitingForResponses] = useState(false);
  const { toast } = useToast();
  const totalParticipants = participants.length;
  
  const toggleSessionState = useCallback(() => {
    setIsSessionPaused(prev => !prev);
    toast({
      title: isSessionPaused ? "Session Resumed" : "Session Paused",
      description: isSessionPaused ? "The session has been resumed." : "The session has been paused.",
    });
  }, [isSessionPaused, toast]);

  const handleHostMessage = useCallback((message: Message) => {
    console.log("Host: Processing new message:", message);
    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) return prev;
      return [...prev, message];
    });
    
    // Update response tracking for participant messages
    if (message.sender === 'user' && message.participant) {
      setResponseCount(prev => Math.min(prev + 1, totalParticipants));
    }
  }, [setMessages, totalParticipants]);

  const handleSendHostMessage = useCallback(async (content: string, isPinned: boolean = false, recipientId?: string) => {
    if (!conversationId) return;
    
    try {
      console.log("Host sending message:", { content, isPinned, recipientId });
      
      const messageData = {
        conversation_id: conversationId,
        content: content,
        role: 'assistant',
        name: conversationData?.sessions?.facilitator_details?.title || 'Host'
      };

      const { error } = await supabase
        .from('messages')
        .insert(messageData);

      if (error) {
        console.error("Error sending host message:", error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Message Sent",
          description: "Your message has been sent to participants."
        });
      }
    } catch (error) {
      console.error("Exception sending host message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  }, [conversationId, conversationData, toast]);

  const triggerFacilitatorResponse = useCallback(() => {
    console.log("Host triggering facilitator response");
    setIsWaitingForResponses(false);
    setResponseCount(0);
  }, []);

  return {
    isSessionPaused,
    toggleSessionState,
    handleHostMessage,
    handleSendHostMessage,
    responseCount,
    isWaitingForResponses,
    totalParticipants,
    triggerFacilitatorResponse
  };
}
