
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message, ParticipantInfo } from '@/types/chat';
import { ConversationWithSession } from '@/types/database';
import { useToast } from '@/components/ui/use-toast';
import { useAdminSessionState } from './useAdminSessionState';

// Create a function to log channel information in a controlled way
const logChannelStatus = (channelRef: any, label: string) => {
  if (!channelRef?.current) return;
  
  try {
    const status = channelRef.current?.state || 'UNKNOWN';
    console.info(`Message channel subscription status (${label}): ${status}`);
  } catch (err) {
    // Silently ignore errors from logging
  }
};

interface UseAdminMessagesProps {
  conversationId: number | null;
  participants: ParticipantInfo[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  conversationData?: ConversationWithSession | null;
}

export function useAdminMessages({
  conversationId,
  participants,
  messages,
  setMessages,
  conversationData
}: UseAdminMessagesProps) {
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const messageSubscriptionRef = useRef<any>(null);
  const cleanupAttemptedRef = useRef(false);
  const [hasInitializedChannel, setHasInitializedChannel] = useState(false);
  const { toast } = useToast();
  
  // Use the admin session state hook
  const {
    isSessionPaused,
    isExporting,
    toggleSessionState,
    sendAdminMessage,
    exportSessionData
  } = useAdminSessionState({
    conversationId,
    currentUserParticipantId: null,
    participants,
    messages,
    setMessages
  });
  
  // Load initial messages from the database when conversation ID changes
  useEffect(() => {
    if (!conversationId) return;
    
    const loadInitialMessages = async () => {
      try {
        console.info(`Admin: Fetching initial messages for conversation: ${conversationId}`);
        
        // Query the database for messages
        const { data: dbMessages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
          
        if (error) {
          console.error('Error fetching initial messages:', error);
          return;
        }
        
        if (!dbMessages || dbMessages.length === 0) {
          console.info('No database messages found for admin view');
          
          // If there are no messages but we have conversation data with welcome_message, use that
          if (conversationData?.sessions?.welcome_message) {
            const welcomeMsg = conversationData.sessions.welcome_message;
            console.info(`Admin: Found welcome message: ${welcomeMsg.substring(0, 50)}...`);
            setWelcomeMessage(welcomeMsg);
            
            // Create welcome message in the expected format
            const initialWelcomeMessage: Message = {
              id: 'welcome-message',
              content: welcomeMsg,
              sender: 'assistant',
              timestamp: new Date(),
              isWelcomeMessage: true
            };
            
            // Set it as the first message
            setMessages([initialWelcomeMessage]);
          }
          return;
        }
        
        // Map database messages to Message type
        const parsedMessages: Message[] = dbMessages.map(msg => {
          // Extract message content safely
          let messageContent = '';
          let isAnonymous = false;
          let participantId: string | undefined = undefined;
          let isPinned = false;
          let recipientId: string | undefined = undefined;
          
          // Handle content based on its type
          if (typeof msg.content === 'string') {
            messageContent = msg.content;
          } else if (msg.content && typeof msg.content === 'object') {
            // Extract message from content object
            if ('message' in msg.content && msg.content.message) {
              messageContent = String(msg.content.message);
            } else if ('text' in msg.content && msg.content.text) {
              messageContent = String(msg.content.text);
            }
            
            // Extract other properties
            if ('is_anonymous' in msg.content) {
              isAnonymous = Boolean(msg.content.is_anonymous);
            }
            
            if ('participant_id' in msg.content) {
              participantId = `P${msg.content.participant_id}`;
            }
            
            if ('isPinned' in msg.content) {
              isPinned = Boolean(msg.content.isPinned);
            }
            
            if ('recipientId' in msg.content) {
              recipientId = String(msg.content.recipientId);
            }
          }
          
          return {
            id: `msg-${msg.id}`,
            content: messageContent,
            sender: msg.role === 'user' ? 'user' : 'assistant',
            timestamp: new Date(msg.created_at),
            isAnonymous: isAnonymous,
            participant: participantId,
            isPinned: isPinned,
            isAdminMessage: msg.role === 'admin',
            recipientId: recipientId
          };
        });
        
        // Set messages
        setMessages(parsedMessages);
      } catch (error) {
        console.error('Error in loadInitialMessages:', error);
      }
    };
    
    loadInitialMessages();
  }, [conversationId, conversationData, setMessages]);
  
  // Set up real-time subscription for new messages
  useEffect(() => {
    // Skip if no conversation ID or channel is already initialized
    if (!conversationId || hasInitializedChannel) return;
    
    console.info(`Setting up realtime subscription for messages in conversation: ${conversationId} (admin view)`);
    
    // Clean up any existing subscription to avoid duplicate listeners
    if (messageSubscriptionRef.current) {
      try {
        console.info('Cleaning up existing message subscription before creating new one');
        supabase.removeChannel(messageSubscriptionRef.current);
        messageSubscriptionRef.current = null;
        cleanupAttemptedRef.current = true;
      } catch (err) {
        console.error('Error cleaning up message subscription:', err);
      }
    }
    
    // Generate a unique channel name to prevent conflicts
    const channelName = `admin-messages-${conversationId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    try {
      const subscription = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          // Process new message
          if (payload.new) {
            const newMsg = payload.new;
            
            // Skip if we already have this message (check by database ID)
            const existingMsg = messages.find(m => m.id === `msg-${newMsg.id}`);
            if (existingMsg) return;
            
            // Transform to our Message type
            const message: Message = {
              id: `msg-${newMsg.id}`,
              content: typeof newMsg.content === 'string' ? newMsg.content : newMsg.content?.message || '',
              sender: newMsg.role === 'user' ? 'user' : 'assistant',
              timestamp: new Date(newMsg.created_at),
              isAnonymous: newMsg.is_anonymous,
              participant: newMsg.participant_id ? `P${newMsg.participant_id}` : undefined,
              isPinned: newMsg.content?.isPinned || false,
              isAdminMessage: newMsg.role === 'admin',
              recipientId: newMsg.content?.recipientId
            };
            
            // Add to messages state
            setMessages(prev => [...prev, message]);
          }
        })
        .subscribe(status => {
          console.info(`Admin message channel subscription status: ${status}`);
        });
      
      // Store the subscription ref for cleanup
      messageSubscriptionRef.current = subscription;
      setHasInitializedChannel(true);
      
    } catch (err) {
      console.error('Error subscribing to messages:', err);
      
      // Mark as initialized anyway to prevent constant retries
      setHasInitializedChannel(true);
    }
    
    // Cleanup function
    return () => {
      try {
        console.info('Cleaning up message sync channel for admin');
        logChannelStatus(messageSubscriptionRef, 'admin');
        
        // Only attempt cleanup if there's a valid subscription
        if (messageSubscriptionRef.current && !cleanupAttemptedRef.current) {
          const channel = messageSubscriptionRef.current;
          messageSubscriptionRef.current = null; // Clear ref before removing to prevent loops
          cleanupAttemptedRef.current = true;
          
          // Remove the channel
          supabase.removeChannel(channel);
        }
      } catch (err) {
        console.info('Channel error detected in admin view, will clean up and restart');
        logChannelStatus(messageSubscriptionRef, 'admin');
        
        // Ensure the ref is cleared to avoid infinite recursion
        messageSubscriptionRef.current = null;
        cleanupAttemptedRef.current = true;
      }
    };
  }, [conversationId, hasInitializedChannel, messages, setMessages]);
  
  // Handle sending a message as admin
  const handleAdminMessage = useCallback((message: string, isPinned: boolean = false, recipientId?: string) => {
    return sendAdminMessage(message, isPinned, recipientId);
  }, [sendAdminMessage]);
  
  // Handle sending a quick admin message
  const handleSendAdminMessage = useCallback((message: string) => {
    return sendAdminMessage(message, false);
  }, [sendAdminMessage]);
  
  return {
    welcomeMessage,
    isSessionPaused,
    isExporting,
    toggleSessionState,
    exportSessionData,
    handleAdminMessage,
    handleSendAdminMessage
  };
}

export default useAdminMessages;
