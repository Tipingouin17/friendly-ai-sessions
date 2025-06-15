
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

  // Enhanced fetch function with forced refresh capability
  const fetchMessages = useCallback(async (forceRefresh = false) => {
    if (!conversationId) {
      debugLog('all', 'No conversation ID provided, skipping message fetch');
      return;
    }
    
    try {
      debugLog('all', `Fetching messages for conversation: ${conversationId} (force: ${forceRefresh})`);
      
      // Always check current session status
      const { data: conversationData, error: convError } = await supabase
        .from('conversations')
        .select('session_started')
        .eq('id', conversationId)
        .single();
        
      if (convError) {
        console.error('Error checking session status:', convError);
      }
      
      const sessionStarted = conversationData?.session_started || false;
      debugLog('all', `Session started status: ${sessionStarted}`);
      
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
      
      debugLog('all', `Fetched ${data?.length || 0} messages from database`);
      
      // If session started but no messages, try to get/create welcome message
      if (sessionStarted && (!data || data.length === 0) && welcomeMessage) {
        debugLog('all', 'Session started with no messages - checking for welcome message');
        
        const cachedWelcomeMsg = getCachedWelcomeMessage();
        if (cachedWelcomeMsg) {
          debugLog('all', 'Using cached welcome message');
          setMessages([cachedWelcomeMsg]);
          return;
        }
        
        // Create and save welcome message
        const welcomeMsg = await createWelcomeMessage();
        if (welcomeMsg) {
          debugLog('all', 'Created new welcome message');
          setMessages([welcomeMsg]);
          saveWelcomeMessageToDb(welcomeMsg);
        }
        return;
      }
      
      // If we have database messages, format and display them
      if (data && data.length > 0) {
        const formattedMessages = await formatDatabaseMessages(data);
        debugLog('all', `Successfully formatted ${formattedMessages.length} messages`);
        setMessages(formattedMessages);
        return;
      }
      
      // If session not started and no messages, show empty state
      if (!sessionStarted) {
        debugLog('all', 'Session not started - showing empty state');
        setMessages([]);
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

  // Force refresh function for when session starts
  const forceRefreshMessages = useCallback(() => {
    debugLog('all', 'Force refreshing messages due to session start');
    return fetchMessages(true);
  }, [fetchMessages]);

  return {
    messages,
    setMessages,
    error,
    fetchMessages,
    forceRefreshMessages
  };
};
