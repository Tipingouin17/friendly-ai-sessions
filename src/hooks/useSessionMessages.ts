
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/chat';
import { getParticipantColor } from '@/utils/sessionHelpers';

const WELCOME_MESSAGE_DELAY = 1000; // 1 second delay before showing welcome message

interface UseSessionMessagesProps {
  conversationId: number | null;
  welcomeMessage: string | null;
}

export const useSessionMessages = ({
  conversationId,
  welcomeMessage
}: UseSessionMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  
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
          // Extract participant ID if available (it might be null)
          let participantId: string | undefined = undefined;
          if ('participant_id' in msg && msg.participant_id) {
            participantId = `P${msg.participant_id}`;
          }
          
          const color = participantId ? getParticipantColor(participantId) : undefined;
          
          // Ensure likes is always an array
          let likesArray: string[] = [];
          if ('likes' in msg && msg.likes) {
            // If likes exists and is not null, ensure it's an array
            likesArray = Array.isArray(msg.likes) ? msg.likes : [];
          }
          
          return {
            id: String(msg.id),
            content: msg.content as string,
            sender: msg.role === 'assistant' ? 'assistant' : 'user',
            participant: participantId,
            color,
            timestamp: new Date(msg.created_at),
            created_at: msg.created_at,
            likes: likesArray,
            isReport: 'is_report' in msg ? Boolean(msg.is_report) : false,
            isAnonymous: 'is_anonymous' in msg ? Boolean(msg.is_anonymous) : false
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
    error
  };
};
