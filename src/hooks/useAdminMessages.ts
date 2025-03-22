
import { useState, useEffect, useCallback } from "react";
import { Message, ParticipantInfo } from "@/types/chat";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSessionState } from "@/hooks/useAdminSessionState";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";
import { useMessageRealtime } from "@/hooks/useMessageRealtime";

interface UseAdminMessagesProps {
  conversationId: number | null;
  participants: ParticipantInfo[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useAdminMessages({ 
  conversationId, 
  participants = [], 
  messages = [], 
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
    participants: participants || [],
    messages: messages || [], 
    setMessages
  });

  // Set up realtime message listening with enhanced hook
  const { forceRefresh } = useMessageRealtime({
    currentConversationId: conversationId,
    viewMode: "admin",
    setMessages
  });

  // Initial message fetch
  useEffect(() => {
    if (conversationId) {
      const fetchInitialMessages = async () => {
        try {
          console.log('Admin: Fetching initial messages for conversation:', conversationId);
          
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
            
          if (error) {
            console.error('Error fetching messages in admin view:', error);
            return;
          }
          
          if (!data || data.length === 0) {
            console.log('No messages found for admin view');
            return;
          }
          
          // Transform messages to our format
          const formattedMessages = data.map(msg => {
            let messageContent = '';
            let participantId: string | undefined = undefined;
            let isAnonymous = false;
            
            if (typeof msg.content === 'string') {
              messageContent = msg.content;
            } else if (msg.content && typeof msg.content === 'object') {
              const contentObj = msg.content as Record<string, any>;
              
              if ('text' in contentObj) {
                messageContent = contentObj.text as string;
              } else if ('message' in contentObj) {
                messageContent = contentObj.message as string;
              } else {
                messageContent = JSON.stringify(contentObj);
              }
              
              if ('participant_id' in contentObj) {
                participantId = `P${contentObj.participant_id}`;
              }
              
              isAnonymous = 'is_anonymous' in contentObj ? Boolean(contentObj.is_anonymous) : false;
            }
            
            return {
              id: String(msg.id),
              content: messageContent,
              sender: msg.role === 'assistant' ? 'assistant' : 'user',
              participant: participantId,
              timestamp: new Date(msg.created_at),
              isAnonymous
            } as Message;
          });
          
          console.log('Admin: Loaded initial messages:', formattedMessages.length);
          setMessages(formattedMessages);
        } catch (err) {
          console.error('Error in admin message initialization:', err);
        }
      };
      
      fetchInitialMessages();
      
      // Set up a refresh interval for the admin view
      const refreshInterval = setInterval(() => {
        forceRefresh();
      }, 15000); // Refresh every 15 seconds as a backup
      
      return () => clearInterval(refreshInterval);
    }
  }, [conversationId, setMessages, forceRefresh]);

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
            
            // Force a refresh of messages after sending
            setTimeout(() => forceRefresh(), 500);
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
  
  // Force initial refresh
  useEffect(() => {
    if (conversationId) {
      forceRefresh();
    }
  }, [conversationId, forceRefresh]);
  
  return {
    isSessionPaused,
    isExporting,
    toggleSessionState,
    exportSessionData,
    handleAdminMessage,
    handleSendAdminMessage,
    refreshMessages: forceRefresh
  };
}
