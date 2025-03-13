
import { useState, useEffect } from "react";
import { Message, ParticipantInfo } from "@/types/chat";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSessionState } from "@/hooks/useAdminSessionState";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";

interface UseAdminMessagesProps {
  conversationId: number | null;
  participants: ParticipantInfo[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useAdminMessages({ 
  conversationId, 
  participants = [], // Provide default empty array
  messages = [], // Provide default empty array
  setMessages 
}: UseAdminMessagesProps) {
  const { toast } = useToast();
  const { setAdminStatus } = useSessionAdminStatus();
  
  const {
    isSessionPaused,
    isExporting,
    toggleSessionState,
    sendAdminMessage,
    exportSessionData
  } = useAdminSessionState({
    conversationId,
    currentUserParticipantId: null,
    participants: participants || [], // Ensure it's always an array
    messages: messages || [], // Ensure it's always an array
    setMessages
  });

  const handleSendAdminMessage = (message: string) => {
    if (!message.trim() || !conversationId) return;
    
    // Ensure admin status
    sessionStorage.setItem('isAdminSession', 'true');
    setAdminStatus(true);
    
    try {
      const notificationContent = {
        type: "admin_notification",
        message: message
      };
      
      supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: notificationContent,
          role: 'admin',
          created_at: new Date().toISOString()
        })
        .then(({ error }) => {
          if (error) {
            console.error("Error sending admin notification:", error);
            toast({
              title: "Error",
              description: "Failed to send notification to participants",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Notification sent",
              description: "Your message has been sent to all participants",
            });
          }
        });
      
      sendAdminMessage(message, true);
    } catch (error) {
      console.error("Error in handleSendAdminMessage:", error);
      toast({
        title: "Error",
        description: "Failed to send message to participants",
        variant: "destructive"
      });
    }
  };

  const handleAdminMessage = (message: string, isPinned: boolean = false, recipientId?: string) => {
    // Ensure admin status
    sessionStorage.setItem('isAdminSession', 'true');
    setAdminStatus(true);
    
    handleSendAdminMessage(message);
  };
  
  return {
    isSessionPaused,
    isExporting,
    toggleSessionState,
    exportSessionData,
    handleAdminMessage,
    handleSendAdminMessage
  };
}
