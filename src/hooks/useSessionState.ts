
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/chat';
import { getParticipantColor } from '@/utils/sessionHelpers';

const WELCOME_MESSAGE_DELAY = 1000; // 1 second delay before showing welcome message

type UseSessionStateProps = {
  conversationId: number | null;
  welcomeMessage: string | null;
  currentUserParticipantId: number | null;
};

export const useSessionState = ({
  conversationId,
  welcomeMessage,
  currentUserParticipantId
}: UseSessionStateProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"participant" | "admin">("participant");
  const [error, setError] = useState<string | null>(null);
  const [participantResponded, setParticipantResponded] = useState<{[key: number]: boolean}>({});
  
  // Calculate metrics for UI
  const hasAnswered = messages.some(message => 
    message.participant === `P${currentUserParticipantId}` && message.sender === "user"
  );
  
  const totalResponses = messages.filter(message => message.sender === "user").length;

  // Record if a participant has responded
  const recordResponse = useCallback((participantId: number, hasResponded: boolean) => {
    setParticipantResponded(prev => ({...prev, [participantId]: hasResponded}));
  }, []);
  
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
  
  // Handle generating the session report
  const handleGenerateReport = useCallback(async () => {
    if (!conversationId) {
      console.error('No conversation ID provided for report generation');
      setError('Cannot generate report: session not found');
      return;
    }
    
    setIsGeneratingReport(true);
    
    try {
      console.log('Generating report for conversation:', conversationId);
      
      // Find the last participant message to determine where we are in the conversation
      let lastParticipantMessageIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].sender === 'user') {
          lastParticipantMessageIndex = i;
          break;
        }
      }
      
      // If we have participant messages, use the API endpoint to generate a report
      if (lastParticipantMessageIndex !== -1) {
        const response = await fetch('/api/generate-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId })
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const reportData = await response.json();
        
        // Add the report to our messages
        const reportMessage: Message = {
          id: `report-${Date.now()}`,
          content: reportData.report,
          sender: 'assistant',
          timestamp: new Date(),
          created_at: new Date().toISOString(),
          isReport: true
        };
        
        setMessages(prev => [...prev, reportMessage]);
      } else {
        throw new Error('No participant messages found to generate report');
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError(`Failed to generate session report: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingReport(false);
    }
  }, [conversationId, messages]);
  
  return {
    messages,
    inputMessage,
    setInputMessage,
    currentParticipant: currentUserParticipantId || 0,
    isRecording,
    setIsRecording,
    handleGenerateReport,
    isGeneratingReport,
    setMessages,
    hasAnswered,
    totalResponses,
    viewMode,
    setViewMode,
    recordResponse,
    error
  };
};
