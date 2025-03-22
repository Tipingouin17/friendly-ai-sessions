
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/chat';
import { getParticipantColor } from '@/utils/sessionHelpers';

const WELCOME_MESSAGE_DELAY = 1000; // 1 second delay before showing welcome message

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
  
  // Fetch messages for this conversation
  useEffect(() => {
    if (!conversationId) {
      console.log('No conversation ID provided, skipping message fetch');
      return;
    }
    
    const fetchMessages = async () => {
      try {
        console.log('Fetching messages for conversation:', conversationId);
        
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
          // Add welcome message after a delay if one is provided
          if (welcomeMessage) {
            setTimeout(() => {
              const welcomeMsg: Message = {
                id: 'welcome',
                content: welcomeMessage,
                sender: 'assistant',
                timestamp: new Date(),
                created_at: new Date().toISOString()
              };
              setMessages([welcomeMsg]);
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
            isAnonymous
          } as Message; // Type assertion to ensure it matches the Message type
        });
        
        console.log('Successfully fetched messages:', formattedMessages.length);
        setMessages(formattedMessages);
      } catch (err) {
        console.error('Exception fetching messages:', err);
        setError('Failed to load session messages');
      }
    };

    fetchMessages();
  }, [conversationId, welcomeMessage]);
  
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
