
import { useState, useCallback } from 'react';
import { Message } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { getParticipantColor } from '@/utils/sessionHelpers';
import { debugLog } from '@/utils/debugLogger';
import { useWelcomeMessage } from './useWelcomeMessage';
import { processFacilitatorAvatar } from './utils/avatarProcessing';

interface UseMessageFetchingProps {
  conversationId: number | null;
  welcomeMessage?: string | null;
  isAdmin: boolean;
}

export const useMessageFetching = ({
  conversationId,
  welcomeMessage,
  isAdmin
}: UseMessageFetchingProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    getCachedWelcomeMessage, 
    createWelcomeMessage 
  } = useWelcomeMessage({
    conversationId,
    welcomeMessage,
    isAdmin
  });

  // Format database messages into app format
  const formatDatabaseMessages = useCallback(async (dbMessages: any[]): Promise<Message[]> => {
    // Process messages with async processing
    const formattedMessagesPromises = dbMessages.map(async msg => {
      let messageContent = '';
      let participantId: string | undefined = undefined;
      let likesArray: string[] = [];
      let isReport = false;
      let isAnonymous = false;
      let avatarUrl = undefined;
      
      if (typeof msg.content === 'string') {
        messageContent = msg.content;
      } else if (msg.content && typeof msg.content === 'object') {
        const contentObj = msg.content as Record<string, any>;
        
        if ('text' in contentObj) {
          messageContent = contentObj.text as string;
        } else {
          messageContent = JSON.stringify(contentObj);
        }
        
        if ('participant_id' in contentObj) {
          participantId = `P${contentObj.participant_id}`;
        }
        
        if ('likes' in contentObj && Array.isArray(contentObj.likes)) {
          likesArray = contentObj.likes as string[];
        }
        
        if ('avatar' in contentObj && contentObj.avatar) {
          avatarUrl = contentObj.avatar as string;
          debugLog('all', `Found avatar in message content: ${avatarUrl}`);
        }
        
        isReport = 'is_report' in contentObj ? Boolean(contentObj.is_report) : false;
        isAnonymous = 'is_anonymous' in contentObj ? Boolean(contentObj.is_anonymous) : false;
      }
      
      const color = participantId ? getParticipantColor(participantId) : undefined;
      
      // Handle facilitator avatar for assistant messages
      if (msg.role === 'assistant') {
        if (!avatarUrl) {
          avatarUrl = await getFacilitatorAvatarUrl({
            title: 'Facilitator'
          });
          debugLog('all', `Generated facilitator avatar URL: ${avatarUrl}`);
        }
        
        // Ensure avatar URL is properly formatted
        if (avatarUrl) {
          avatarUrl = processFacilitatorAvatar(avatarUrl);
        }
      }
      
      return {
        id: String(msg.id),
        content: messageContent,
        sender: msg.role === 'assistant' ? 'assistant' : 'user',
        participant: participantId,
        color,
        timestamp: new Date(msg.created_at),
        created_at: msg.created_at,
        likes: likesArray,
        isReport,
        isAnonymous,
        avatar: avatarUrl
      } as Message;
    });
    
    // Wait for all message processing to complete
    return await Promise.all(formattedMessagesPromises);
  }, []);
  
  // Save a welcome message to the database (admin only)
  const saveWelcomeMessageToDb = useCallback(async (welcomeMsg: Message) => {
    if (!isAdmin || !conversationId) return;
    
    debugLog('all', 'Admin: Adding welcome message to database for other clients');
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: { 
            text: welcomeMsg.content,
            avatar: welcomeMsg.avatar
          },
          role: 'assistant',
          created_at: new Date().toISOString()
        });
        
      if (error) {
        console.error('Error saving welcome message to database:', error);
      }
    } catch (err) {
      console.error('Exception saving welcome message:', err);
    }
  }, [conversationId, isAdmin]);

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

// Helper function imported from facilitatorUtils
async function getFacilitatorAvatarUrl(params: { title: string }) {
  // This is just a reference to the imported function
  return `/api/avatar?name=${params.title}&variant=beam&palette=2`;
}
