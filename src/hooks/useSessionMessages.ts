import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/chat';
import { getParticipantColor } from '@/utils/sessionHelpers';

const WELCOME_MESSAGE_DELAY = 700; // Reduced delay to show welcome message faster
const WELCOME_MESSAGE_STORAGE_KEY = 'session_welcome_message_';

interface UseSessionMessagesProps {
  conversationId: number | null;
  currentUserParticipantId: number | null;
  isAdmin: boolean;
  welcomeMessage?: string | null;
}

export const useSessionMessages = ({
  conversationId,
  currentUserParticipantId,
  isAdmin,
  welcomeMessage
}: UseSessionMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<number>(0);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [totalResponses, setTotalResponses] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"participant" | "admin">(
    isAdmin ? "admin" : "participant"
  );
  
  // Function to record participant responses
  const recordResponse = useCallback((participantId: number, hasResponded: boolean) => {
    if (participantId === currentUserParticipantId) {
      setHasAnswered(hasResponded);
    }
    if (hasResponded) {
      setTotalResponses(prev => prev + 1);
    }
  }, [currentUserParticipantId]);
  
  // Set current participant based on the user participant ID
  useEffect(() => {
    if (currentUserParticipantId) {
      setCurrentParticipant(currentUserParticipantId);
    }
  }, [currentUserParticipantId]);
  
  // Helper function to get welcome message from storage
  const getCachedWelcomeMessage = useCallback(() => {
    if (!conversationId) return null;
    try {
      const storageKey = `${WELCOME_MESSAGE_STORAGE_KEY}${conversationId}`;
      const cachedMessageData = localStorage.getItem(storageKey);
      if (cachedMessageData) {
        return JSON.parse(cachedMessageData) as Message;
      }
      return null;
    } catch (e) {
      console.error('Error retrieving cached welcome message:', e);
      return null;
    }
  }, [conversationId]);
  
  // Helper function to store welcome message
  const cacheWelcomeMessage = useCallback((welcomeMsg: Message) => {
    if (!conversationId) return;
    try {
      const storageKey = `${WELCOME_MESSAGE_STORAGE_KEY}${conversationId}`;
      localStorage.setItem(storageKey, JSON.stringify(welcomeMsg));
    } catch (e) {
      console.error('Error caching welcome message:', e);
    }
  }, [conversationId]);
  
  // Fetch messages for this conversation
  useEffect(() => {
    if (!conversationId) {
      console.log('No conversation ID provided, skipping message fetch');
      return;
    }
    
    const fetchMessages = async () => {
      try {
        console.log('Fetching messages for conversation:', conversationId);
        
        // Check if we have a cached welcome message first
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
          console.log('No messages found for conversation', conversationId);
          // If we have a cached welcome message, use it
          if (cachedWelcomeMsg) {
            console.log('Using cached welcome message');
            setMessages([cachedWelcomeMsg]);
            return;
          }
          
          // Otherwise, add welcome message if one is provided
          if (welcomeMessage) {
            setTimeout(() => {
              const welcomeMsg: Message = {
                id: 'welcome',
                content: welcomeMessage,
                sender: 'assistant',
                timestamp: new Date(),
                created_at: new Date().toISOString(),
                avatar: '/api/avatar?name=Facilitator&variant=beam&palette=2'
              };
              setMessages([welcomeMsg]);
              // Cache the welcome message for persistence
              cacheWelcomeMessage(welcomeMsg);
            }, WELCOME_MESSAGE_DELAY);
          }
          return;
        }
        
        // Transform database messages to UI message format
        const formattedMessages = data.map(msg => {
          // Extract content data - handle both string and object formats
          let messageContent = '';
          let participantId: string | undefined = undefined;
          let likesArray: string[] = [];
          let isReport = false;
          let isAnonymous = false;
          
          // Check if content is an object or string
          if (typeof msg.content === 'string') {
            messageContent = msg.content;
          } else if (msg.content && typeof msg.content === 'object') {
            // It's an object, safely access properties
            const contentObj = msg.content as Record<string, any>;
            
            // Handle text content
            if ('text' in contentObj) {
              messageContent = contentObj.text as string;
            } else {
              // Fallback to stringifying the object if no text property
              messageContent = JSON.stringify(contentObj);
            }
            
            // Handle participant ID
            if ('participant_id' in contentObj) {
              participantId = `P${contentObj.participant_id}`;
            }
            
            // Handle likes safely
            if ('likes' in contentObj && Array.isArray(contentObj.likes)) {
              likesArray = contentObj.likes as string[];
            }
            
            // Handle report and anonymous flags
            isReport = 'is_report' in contentObj ? Boolean(contentObj.is_report) : false;
            isAnonymous = 'is_anonymous' in contentObj ? Boolean(contentObj.is_anonymous) : false;
          }
          
          const color = participantId ? getParticipantColor(participantId) : undefined;
          
          // Set default avatar for assistant messages - fixed the avatar property assignment here
          // The 'avatar' property isn't in the database schema, so let's create it only for the Message object
          const defaultAssistantAvatar = '/api/avatar?name=Facilitator&variant=beam&palette=2';
          const avatarUrl = msg.role === 'assistant' ? defaultAssistantAvatar : undefined;
          
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
          } as Message; // Type assertion to ensure it matches the Message type
        });
        
        console.log('Successfully fetched messages:', formattedMessages.length);
        
        // If we have a cached welcome message and no assistant messages in the DB data
        const hasAssistantMessage = formattedMessages.some(m => m.sender === 'assistant');
        if (cachedWelcomeMsg && !hasAssistantMessage && welcomeMessage) {
          // Add the cached welcome message at the beginning
          setMessages([cachedWelcomeMsg, ...formattedMessages]);
        } else {
          setMessages(formattedMessages);
        }
      } catch (err) {
        console.error('Exception fetching messages:', err);
        setError('Failed to load session messages');
      }
    };

    fetchMessages();
  }, [conversationId, welcomeMessage, getCachedWelcomeMessage, cacheWelcomeMessage]);
  
  return {
    messages,
    setMessages,
    error,
    currentParticipant,
    recordResponse,
    totalResponses,
    hasAnswered,
    viewMode,
    setViewMode
  };
};
