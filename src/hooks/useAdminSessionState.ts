/**
 * use Admin Session State
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useCallback } from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UseAdminSessionStateProps {
  conversationId: number | null;
  currentUserParticipantId: number | null;
  participants: ParticipantInfo[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useAdminSessionState({
  conversationId,
  currentUserParticipantId,
  participants,
  messages,
  setMessages
}: UseAdminSessionStateProps) {
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  const { toast } = useToast();

  // Toggle session state (active/paused)
  const toggleSessionState = useCallback(async () => {
    if (!conversationId) return;

    try {
      setIsSessionPaused(prevState => !prevState);
      
      // In a real implementation, we would update the database
      // to reflect the session state
      toast({
        title: isSessionPaused ? "Session resumed" : "Session paused",
        description: isSessionPaused 
          ? "Participants can now send messages" 
          : "Participants are restricted from sending new messages",
      });
      
      // Here we would update the session state in the database
      // For now, we'll just notify the admin and toggle the UI state
    } catch (error) {
      console.error("Error toggling session state:", error);
      toast({
        title: "Error",
        description: "Failed to update session state. Please try again.",
        variant: "destructive",
      });
    }
  }, [conversationId, isSessionPaused, toast]);

  // Send admin message to all participants or specific participant
  const sendAdminMessage = useCallback(async (message: string, isPinned: boolean = false, recipientId?: string) => {
    if (!conversationId) return;

    try {
      const newMessage: Message = {
        id: `admin-${Date.now()}`,
        content: message,
        sender: "admin", // Changed from "assistant" to "admin"
        timestamp: new Date(),
        isPinned,
        recipientId,
        isAdminMessage: true
      };

      // Add to local state to immediately show in the UI
      setMessages(prevMessages => [...prevMessages, newMessage]);
      
      // In a real implementation, send to database via Supabase
      if (conversationId) {
        // Format for database - make sure we're sending content as a JSON object
        const messageData = {
          conversation_id: conversationId,
          content: {
            text: message, // The actual message text
            isPinned, // Whether the message should be pinned
            recipientId // Who the message is for (if anyone specific)
          },
          role: 'admin' // Set role as 'admin' instead of 'assistant'
        };
        
        // Send to database
        const { error } = await supabase
          .from('messages')
          .insert(messageData);
          
        if (error) {
          console.error("Error sending admin message to database:", error);
          toast({
            title: "Error",
            description: "Failed to save admin message to database.",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Message sent",
        description: recipientId 
          ? `Your message has been sent to the selected participant` 
          : `Your message has been sent to all participants`,
      });
    } catch (error) {
      console.error("Error sending admin message:", error);
      toast({
        title: "Error",
        description: "Failed to send admin message. Please try again.",
        variant: "destructive",
      });
    }
  }, [conversationId, setMessages, toast]);

  return {
    isSessionPaused,
    toggleSessionState,
    sendAdminMessage
  };
}
