
import { useState, useEffect, useCallback, useRef } from "react";
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
  const loadingRef = useRef(false);
  const welcomeMessageFetchedRef = useRef(false);
  
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

  // Initial message fetch - optimized to reduce redundant fetches
  useEffect(() => {
    if (!conversationId || loadingRef.current) {
      return;
    }
    
    const fetchInitialMessages = async () => {
      try {
        loadingRef.current = true;
        console.log('Admin: Fetching initial messages for conversation:', conversationId);
        
        // Only fetch welcome message if we haven't already
        if (!welcomeMessageFetchedRef.current) {
          const { data: conversationData, error: convError } = await supabase
            .from('conversations')
            .select(`
              sessions!conversations_sessions_id_fkey (
                welcome_message
              )
            `)
            .eq('id', conversationId)
            .maybeSingle();
          
          if (!convError && conversationData?.sessions?.welcome_message) {
            const welcomeMessage = conversationData.sessions.welcome_message;
            console.log('Admin: Found welcome message:', welcomeMessage.substring(0, 50) + '...');
            
            setMessages(prev => {
              // Check if welcome message already exists
              if (!prev.some(m => m.id.startsWith('welcome-') || m.content === welcomeMessage)) {
                const welcomeMsg: Message = {
                  id: 'welcome-' + Date.now(),
                  content: welcomeMessage,
                  sender: 'assistant',
                  timestamp: new Date(),
                  avatar: '/api/avatar?name=Facilitator&variant=beam&palette=2'
                };
                
                return [welcomeMsg];
              }
              
              return prev;
            });
            
            welcomeMessageFetchedRef.current = true;
          }
        }
        
        // Fetch all messages from the database
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
          
        if (error) {
          console.error('Error fetching messages in admin view:', error);
          loadingRef.current = false;
          return;
        }
        
        if (!data || data.length === 0) {
          console.log('No database messages found for admin view');
          loadingRef.current = false;
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
            isAnonymous,
            avatar: msg.role === 'assistant' ? '/api/avatar?name=Facilitator&variant=beam&palette=2' : undefined
          } as Message;
        });
        
        console.log('Admin: Loaded initial messages:', formattedMessages.length);
        
        // Update messages state with deduplicated messages
        setMessages(prev => {
          // Get existing welcome messages
          const welcomeMessages = prev.filter(m => m.id.startsWith('welcome-'));
          
          // Create a map of message IDs for quick lookup
          const existingIds = new Set(prev.map(m => m.id));
          
          // Filter out duplicates from formatted messages
          const newMessages = formattedMessages.filter(m => !existingIds.has(m.id));
          
          // Combine welcome messages and new messages
          return [...welcomeMessages, ...newMessages];
        });
      } catch (err) {
        console.error('Error in admin message initialization:', err);
      } finally {
        loadingRef.current = false;
      }
    };
    
    fetchInitialMessages();
  }, [conversationId, setMessages]);

  const handleSendAdminMessage = useCallback((message: string) => {
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
  }, [conversationId, forceRefresh, setAdminStatus, sendAdminMessage, toast]);

  const handleAdminMessage = useCallback((message: string, isPinned: boolean = false, recipientId?: string) => {
    // Ensure admin status
    sessionStorage.setItem('isAdminSession', 'true');
    setAdminStatus(true);
    
    handleSendAdminMessage(message);
  }, [handleSendAdminMessage, setAdminStatus]);
  
  // Force initial refresh only once
  useEffect(() => {
    if (conversationId && !loadingRef.current) {
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
