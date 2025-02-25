
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Message } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import LoadingState from "@/components/session/LoadingState";
import EmptyState from "@/components/session/EmptyState";
import SessionContainer from "@/components/session/SessionContainer";

const participantColors = {
  P1: "#FCA5A5", P2: "#FDBA74", P3: "#BEF264", P4: "#86EFAC",
  P5: "#6EE7B7", P6: "#5EEAD4", P7: "#67E8F9", P8: "#7DD3FC",
};

const fetchConversation = async (id: number) => {
  console.log('Fetching conversation with ID:', id);
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      sessions:sessions_id (
        id,
        title,
        objective,
        welcome_message,
        facilitator,
        facilitator:facilitators (
          id,
          title,
          profile_picture,
          details
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching conversation:', error);
    throw error;
  }
  console.log('Fetched conversation:', data);
  return data;
};

const Session = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState(1);
  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [participantMessages, setParticipantMessages] = useState<{[key: string]: string}>({});
  const [welcomeMessageSent, setWelcomeMessageSent] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);

  // Initialize conversation ID from location state or URL params
  useEffect(() => {
    console.log('Location state:', location.state);
    console.log('Location search:', location.search);
    
    const state = location.state as { newConversationId?: number; replace?: boolean } | null;
    
    if (state?.newConversationId) {
      console.log('Setting conversation ID from state:', state.newConversationId);
      setCurrentConversationId(state.newConversationId);
      if (state.replace) {
        setMessages([]);
        setWelcomeMessageSent(false);
        setParticipantMessages({});
        window.history.replaceState({}, '');
        queryClient.invalidateQueries({ queryKey: ['conversation', state.newConversationId] });
      }
    } else {
      const params = new URLSearchParams(location.search);
      const conversationId = params.get('id');
      if (conversationId) {
        console.log('Setting conversation ID from URL:', conversationId);
        setCurrentConversationId(Number(conversationId));
      } else {
        console.log('No conversation ID found in state or URL');
        // If no conversation ID is found, redirect to my-facilitators
        navigate('/my-facilitators');
      }
    }
  }, [location, queryClient, navigate]);

  // Query for conversation data
  const { data: conversation, isLoading, error } = useQuery({
    queryKey: ['conversation', currentConversationId],
    queryFn: () => currentConversationId ? fetchConversation(currentConversationId) : null,
    enabled: !!currentConversationId,
  });

  useEffect(() => {
    if (error) {
      console.error('Error in conversation query:', error);
      toast({
        title: "Error",
        description: "Failed to load the session. Please try again.",
        variant: "destructive",
      });
      navigate('/my-facilitators');
    }
  }, [error, navigate, toast]);

  useEffect(() => {
    if (conversation?.sessions?.welcome_message && !welcomeMessageSent) {
      console.log('Setting welcome message:', conversation.sessions.welcome_message);
      setMessages([{
        id: Date.now().toString(),
        content: conversation.sessions.welcome_message,
        sender: "assistant",
        timestamp: new Date(),
      }]);
      setWelcomeMessageSent(true);
    }
  }, [conversation, welcomeMessageSent]);

  const handleParticipantSwitch = (participantNumber: number) => {
    setCurrentParticipant(participantNumber);
    setInputMessage(participantMessages[`P${participantNumber}`] || "");
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentConversationId) return;

    const currentParticipantKey = `P${currentParticipant}`;
    setParticipantMessages(prev => ({
      ...prev,
      [currentParticipantKey]: inputMessage
    }));

    const updatedMessages = {
      ...participantMessages,
      [currentParticipantKey]: inputMessage
    };
    const totalParticipants = conversation?.participants || 1;
    const allParticipantsResponded = Object.keys(updatedMessages).length === totalParticipants;

    if (allParticipantsResponded) {
      const participantResponses: Message[] = Object.entries(updatedMessages).map(([participant, content], index) => ({
        id: Date.now().toString() + index,
        content,
        sender: "user",
        participant,
        timestamp: new Date(),
        color: participantColors[participant as keyof typeof participantColors]
      }));

      setMessages(prev => [...prev, ...participantResponses]);

      try {
        const messagesForAI = participantResponses.map(msg => ({
          role: "user",
          content: msg.content,
          name: msg.participant,
          conversation_id: currentConversationId,
          user_id: null,
          // Make sure we only pass the facilitator ID, not the whole object
          facilitator_id: conversation?.sessions?.facilitator?.id || null
        }));

        await supabase
          .from('messages')
          .insert(messagesForAI);

        const response = await supabase.functions.invoke('handle-facilitator-response', {
          body: {
            messages: [...messages, ...messagesForAI],
            conversationId: currentConversationId
          }
        });

        if (response.error) {
          console.error('Edge function error:', response.error);
          throw new Error(response.error.message || 'Failed to get AI response');
        }

        if (!response.data) {
          throw new Error('No response data received from AI');
        }

        const aiResponse: Message = {
          id: response.data.id || Date.now().toString(),
          content: response.data.content,
          sender: "assistant",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiResponse]);
      } catch (error) {
        console.error('Error getting AI response:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to get facilitator's response. Please try again.",
          variant: "destructive",
        });
      }

      setParticipantMessages({});
    } else {
      const nextParticipant = currentParticipant < totalParticipants ? currentParticipant + 1 : 1;
      setCurrentParticipant(nextParticipant);
    }

    setInputMessage("");
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (!conversation || !currentConversationId) {
    console.log('No conversation found, showing empty state');
    console.log('Current conversation:', conversation);
    console.log('Current conversation ID:', currentConversationId);
    return <EmptyState />;
  }

  return (
    <SessionContainer
      facilitator={conversation.sessions.facilitator}
      objective={conversation.sessions.objective}
      participantCount={conversation.participants || 1}
      messages={messages}
      participantColors={participantColors}
      currentParticipant={currentParticipant}
      inputMessage={inputMessage}
      isRecording={isRecording}
      onParticipantSwitch={handleParticipantSwitch}
      setInputMessage={setInputMessage}
      onSendMessage={handleSendMessage}
      setIsRecording={setIsRecording}
    />
  );
};

export default Session;
