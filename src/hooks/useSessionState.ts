
import { useState, useEffect, useCallback, useRef } from "react";
import { nanoid } from "nanoid";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";

type UseSessionStateProps = {
  conversationId: number | null;
  welcomeMessage: string | null;
  currentUserParticipantId?: number | null;
};

export function useSessionState({
  conversationId,
  welcomeMessage,
  currentUserParticipantId
}: UseSessionStateProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [pendingResponses, setPendingResponses] = useState<{ [key: number]: boolean }>({});
  const [totalResponses, setTotalResponses] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [viewMode, setViewMode] = useState<"participant" | "admin">("participant");
  
  // Store in ref to avoid creating a new function on each render
  const welcomeAddedRef = useRef(false);
  const reportGenerationInProgressRef = useRef(false);
  const initialMessagesLoadedRef = useRef(false);
  
  // Ensure current participant is locked to their assigned ID
  const currentParticipant = currentUserParticipantId || 1;

  // Add welcome message if present - only once
  useEffect(() => {
    if (welcomeMessage && messages.length === 0 && !welcomeAddedRef.current) {
      welcomeAddedRef.current = true;
      const welcomeId = nanoid();
      setMessages([
        {
          id: welcomeId,
          content: welcomeMessage,
          sender: "assistant",
          timestamp: new Date(),
          likes: []
        }
      ]);
    }
  }, [welcomeMessage, messages.length]);

  // Load initial messages from the database
  useEffect(() => {
    const fetchMessages = async () => {
      if (!conversationId || initialMessagesLoadedRef.current) return;
      
      try {
        console.log("Fetching messages for conversation:", conversationId);
        
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          console.log(`Loaded ${data.length} messages from database`, data);
          
          // Convert database messages to our Message format
          const convertedMessages: Message[] = data.map(msg => {
            // Determine the participant identifier if it's a user message
            let participant: string | undefined = undefined;
            if (msg.role === 'user') {
              // Try to determine participant ID
              // This may need to be adjusted based on how you store participant info
              participant = msg.name?.startsWith('Participant') 
                ? `P${msg.name.split(' ')[1]}` 
                : undefined;
            }
            
            return {
              id: msg.id.toString(),
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
              sender: msg.role === 'assistant' ? 'assistant' : 'user',
              timestamp: new Date(msg.created_at),
              participant,
              likes: []
            };
          });
          
          // If we have a welcome message, add it at the beginning if not already present
          if (welcomeMessage && welcomeAddedRef.current) {
            const hasWelcome = convertedMessages.some(m => 
              m.sender === 'assistant' && m.content === welcomeMessage
            );
            
            if (!hasWelcome) {
              const welcomeId = nanoid();
              convertedMessages.unshift({
                id: welcomeId,
                content: welcomeMessage,
                sender: "assistant",
                timestamp: new Date(),
                likes: []
              });
            }
          }
          
          setMessages(convertedMessages);
          
          // Check if current participant has already answered the latest question
          if (currentParticipant) {
            // Find the latest facilitator message
            const latestFacilitatorIndex = convertedMessages.findIndex(m => m.sender === 'assistant');
            
            if (latestFacilitatorIndex !== -1) {
              // See if there's a response from this participant after the latest facilitator message
              const hasResponse = convertedMessages.slice(latestFacilitatorIndex + 1)
                .some(m => m.sender === 'user' && m.participant === `P${currentParticipant}`);
              
              setHasAnswered(hasResponse);
              
              // Also update pending responses
              const responses: {[key: number]: boolean} = {};
              convertedMessages.slice(latestFacilitatorIndex + 1)
                .filter(m => m.sender === 'user' && m.participant?.startsWith('P'))
                .forEach(m => {
                  if (m.participant) {
                    const participantId = parseInt(m.participant.slice(1));
                    responses[participantId] = true;
                  }
                });
              
              setPendingResponses(responses);
              setTotalResponses(Object.values(responses).filter(Boolean).length);
            }
          }
          
          initialMessagesLoadedRef.current = true;
        } else {
          console.log("No messages found for conversation:", conversationId);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };
    
    fetchMessages();
    
    // Reset flag when conversation changes
    return () => {
      initialMessagesLoadedRef.current = false;
    };
  }, [conversationId, welcomeMessage, currentParticipant]);

  // Generate session report
  const handleGenerateReport = useCallback(async () => {
    if (!conversationId || reportGenerationInProgressRef.current) {
      console.error("No conversation ID provided or report generation already in progress");
      return;
    }

    reportGenerationInProgressRef.current = true;
    setIsGeneratingReport(true);
    
    try {
      // Aggregate all messages into a single string
      const allMessages = messages.map(m => `${m.sender}: ${m.content}`).join('\n');

      // Call the Supabase function to generate the report
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          conversationId: conversationId,
          messages: allMessages
        }
      });

      if (error) {
        console.error("Error generating report:", error);
      } else {
        console.log("Report generated successfully");

        // Add the report to the messages
        const reportId = nanoid();
        const reportMessage = {
          id: reportId,
          content: data,
          sender: "assistant" as const,
          timestamp: new Date(),
          isReport: true,
          likes: []
        };
        
        setMessages(prevMessages => [...prevMessages, reportMessage]);
        
        // Save report to database
        try {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            content: data,
            role: 'assistant',
            user_id: null
          });
        } catch (dbError) {
          console.error("Error saving report to database:", dbError);
        }
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGeneratingReport(false);
      reportGenerationInProgressRef.current = false;
    }
  }, [conversationId, messages]);

  // Record a response to a facilitator question - memoized to prevent recreation
  const recordResponse = useCallback((participantId: number, hasResponded: boolean) => {
    console.log("Recording response for participant:", participantId, "with hasResponded:", hasResponded);
    
    setPendingResponses(prev => {
      // Skip update if nothing changed
      if (prev[participantId] === hasResponded) {
        return prev;
      }
      
      const newResponses = {
        ...prev,
        [participantId]: hasResponded
      };
      console.log("New pending responses:", newResponses);
      return newResponses;
    });
    
    if (hasResponded && participantId === currentParticipant) {
      setHasAnswered(true);
    }
  }, [currentParticipant]);
  
  // Update total responses count based on pendingResponses
  useEffect(() => {
    const count = Object.values(pendingResponses).filter(Boolean).length;
    if (count !== totalResponses) {
      console.log("Updating total responses count to:", count);
      setTotalResponses(count);
    }
  }, [pendingResponses, totalResponses]);

  // Reset answer state when a new facilitator message arrives
  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (latestMessage?.sender === "assistant" && !latestMessage.isReport) {
      console.log("New facilitator message detected, resetting response state");
      setHasAnswered(false);
      setPendingResponses({});
      setTotalResponses(0);
    }
  }, [messages]);

  return {
    messages,
    setMessages,
    inputMessage,
    setInputMessage,
    currentParticipant,
    isRecording,
    setIsRecording,
    handleGenerateReport,
    isGeneratingReport,
    recordResponse,
    totalResponses,
    hasAnswered,
    pendingResponses,
    viewMode,
    setViewMode
  };
}
