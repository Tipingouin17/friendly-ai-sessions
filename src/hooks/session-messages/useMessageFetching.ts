
import { useState, useCallback } from 'react';
import { Message } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debugLogger';
import { useWelcomeMessage } from './useWelcomeMessage';
import { useMessageFormatting } from './useMessageFormatting';
import { useWelcomeMessageSaver } from './useWelcomeMessageSaver';

interface UseMessageFetchingProps {
  conversationId: number | null;
  welcomeMessage?: string | null;
  isAdmin: boolean;
  conversation?: any;
}

export const useMessageFetching = ({
  conversationId,
  welcomeMessage,
  isAdmin,
  conversation
}: UseMessageFetchingProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    getCachedWelcomeMessage, 
    createWelcomeMessage 
  } = useWelcomeMessage({
    conversationId,
    welcomeMessage,
    isAdmin,
    conversation
  });

  const { formatDatabaseMessages } = useMessageFormatting({ conversation });
  const { saveWelcomeMessageToDb } = useWelcomeMessageSaver({ conversationId, isAdmin });

  // Main fetch function
  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      debugLog('all', 'No conversation ID provided, skipping message fetch');
      return;
    }
    
    try {
      debugLog('all', `Fetching messages for conversation: ${conversationId}`);
      
      const cachedWelcomeMsg = getCachedWelcomeMessage();
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error('Error fetching messages:', error);
        setError(`Failed to fetch messages: ${error.message}`);
        return;
      }
      
      if (!data || data.length === 0) {
        if (cachedWelcomeMsg) {
          debugLog('all', 'Using cached welcome message');
          setMessages([cachedWelcomeMsg]);
          return;
        }
        
        if (welcomeMessage) {
          debugLog('all', 'Adding welcome message to messages list');
          
          const welcomeMsg = await createWelcomeMessage();
          if (welcomeMsg) {
            setMessages([welcomeMsg]);
            saveWelcomeMessageToDb(welcomeMsg);
          }
        }
        return;
      }
      
      // Format the database messages
      const formattedMessages = await formatDatabaseMessages(data);
      
      debugLog('all', `Successfully fetched messages: ${formattedMessages.length}`);
      
      // Determine if we need to include the cached welcome message
      const hasAssistantMessage = formattedMessages.some(m => m.sender === 'assistant');
      if (cachedWelcomeMsg && !hasAssistantMessage && welcomeMessage) {
        setMessages([cachedWelcomeMsg, ...formattedMessages]);
      } else {
        setMessages(formattedMessages);
      }
    } catch (err) {
      console.error('Exception fetching messages:', err);
      setError('Failed to load session messages');
    }
  }, [
    conversationId,
    welcomeMessage,
    conversation,
    getCachedWelcomeMessage,
    createWelcomeMessage,
    formatDatabaseMessages,
    saveWelcomeMessageToDb
  ]);

  return {
    messages,
    setMessages,
    error,
    fetchMessages
  };
};
