
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/chat';
import { getParticipantColor } from '@/utils/sessionHelpers';
import { getFacilitatorAvatarUrl } from '@/utils/facilitatorUtils';
import { resolveFacilitatorAvatar } from '@/utils/avatarUtils';
import { debugLog } from '@/utils/debugLogger';
import { isInCrossOriginContext } from '@/utils/crossOriginUtils';

const WELCOME_MESSAGE_DELAY = 500;
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
  
  // Process a facilitator avatar URL to ensure it's properly formatted
  const processFacilitatorAvatar = useCallback((avatarUrl: string | undefined): string => {
    if (!avatarUrl || avatarUrl === '/placeholder.svg') {
      return `/api/avatar?name=Facilitator&variant=beam&palette=2`;
    }
    
    // Normalize URLs with double slashes
    let processedUrl = avatarUrl.replace(/([^:])\/\//g, '$1/');
    
    // Add crossorigin parameter if needed
    if (isInCrossOriginContext() && !processedUrl.includes('crossorigin=anonymous')) {
      processedUrl += (processedUrl.includes('?') ? '&' : '?') + 'crossorigin=anonymous';
    }
    
    debugLog('all', `Processed facilitator avatar: ${processedUrl}`);
    return processedUrl;
  }, []);
  
  useEffect(() => {
    if (!conversationId) {
      debugLog('all', 'No conversation ID provided, skipping message fetch');
      return;
    }
    
    const fetchMessages = async () => {
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
            
            // Get the facilitator avatar URL
            const facilitatorAvatarUrl = await getFacilitatorAvatarUrl({
              title: 'Facilitator'
            });
            
            // Process the URL to ensure it's correctly formatted
            const processedAvatarUrl = processFacilitatorAvatar(facilitatorAvatarUrl);
            
            const welcomeMsg: Message = {
              id: 'welcome',
              content: welcomeMessage,
              sender: 'assistant',
              timestamp: new Date(),
              created_at: new Date().toISOString(),
              avatar: processedAvatarUrl
            };
            
            setMessages([welcomeMsg]);
            cacheWelcomeMessage(welcomeMsg);
            
            if (isAdmin) {
              debugLog('all', 'Admin: Adding welcome message to database for other clients');
              try {
                const { error } = await supabase
                  .from('messages')
                  .insert({
                    conversation_id: conversationId,
                    content: { 
                      text: welcomeMessage,
                      avatar: processedAvatarUrl
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
            }
          }
          return;
        }
        
        // Process messages with async processing
        const formattedMessagesPromises = data.map(async msg => {
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
        const formattedMessages = await Promise.all(formattedMessagesPromises);
        
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
    };

    fetchMessages();
  }, [conversationId, welcomeMessage, getCachedWelcomeMessage, cacheWelcomeMessage, isAdmin, processFacilitatorAvatar]);
  
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

