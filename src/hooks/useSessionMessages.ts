import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/chat';
import { getParticipantColor } from '@/utils/sessionHelpers';
import { normalizeFacilitatorAvatarUrl } from '@/utils/facilitatorUtils';

const WELCOME_MESSAGE_DELAY = 500; // Reduced delay to show welcome message faster
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
  
  const recordResponse = useCallback((participantId: number, hasResponded: boolean) => {
    if (participantId === currentUserParticipantId) {
      setHasAnswered(hasResponded);
    }
    if (hasResponded) {
      setTotalResponses(prev => prev + 1);
    }
  }, [currentUserParticipantId]);
  
  useEffect(() => {
    if (currentUserParticipantId) {
      setCurrentParticipant(currentUserParticipantId);
    }
  }, [currentUserParticipantId]);
  
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
  
  const cacheWelcomeMessage = useCallback((welcomeMsg: Message) => {
    if (!conversationId) return;
    try {
      const storageKey = `${WELCOME_MESSAGE_STORAGE_KEY}${conversationId}`;
      localStorage.setItem(storageKey, JSON.stringify(welcomeMsg));
    } catch (e) {
      console.error('Error caching welcome message:', e);
    }
  }, [conversationId]);
  
  useEffect(() => {
    if (!conversationId) {
      console.log('No conversation ID provided, skipping message fetch');
      return;
    }
    
    const fetchMessages = async () => {
      try {
        console.log('Fetching messages for conversation:', conversationId);
        
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
            console.log('Using cached welcome message');
            setMessages([cachedWelcomeMsg]);
            return;
          }
          
          if (welcomeMessage) {
            console.log('Adding welcome message to messages list');
            const welcomeMsg: Message = {
              id: 'welcome',
              content: welcomeMessage,
              sender: 'assistant',
              timestamp: new Date(),
              created_at: new Date().toISOString(),
              avatar: '/api/avatar?name=Facilitator&variant=beam&palette=2'
            };
            setMessages([welcomeMsg]);
            cacheWelcomeMessage(welcomeMsg);
            
            if (isAdmin) {
              console.log('Admin: Adding welcome message to database for other clients');
              try {
                const { error } = await supabase
                  .from('messages')
                  .insert({
                    conversation_id: conversationId,
                    content: { text: welcomeMessage },
                    role: 'assistant',
                    created_at: new Date().toISOString()
                  });
                  
                if (error) {
                  console.error('Error saving welcome message to database:', error);
                }
              } catch (err) {
                console.error('Exception saving welcome message:', err);
              }
            }
          }
          return;
        }
        
        const formattedMessages = data.map(msg => {
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
              console.log('Found avatar in message content:', avatarUrl);
            }
            
            isReport = 'is_report' in contentObj ? Boolean(contentObj.is_report) : false;
            isAnonymous = 'is_anonymous' in contentObj ? Boolean(contentObj.is_anonymous) : false;
          }
          
          const color = participantId ? getParticipantColor(participantId) : undefined;
          
          if (msg.role === 'assistant') {
            if (avatarUrl) {
              console.log('Using avatar from message content:', avatarUrl);
            } else {
              avatarUrl = '/api/avatar?name=Facilitator&variant=beam&palette=2';
              console.log('Using default facilitator avatar');
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
        
        console.log('Successfully fetched messages:', formattedMessages.length);
        
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
    };

    fetchMessages();
  }, [conversationId, welcomeMessage, getCachedWelcomeMessage, cacheWelcomeMessage, isAdmin]);
  
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
