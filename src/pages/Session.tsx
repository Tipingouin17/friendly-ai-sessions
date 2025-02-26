
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useConversation } from "@/hooks/useConversation";
import { useSessionState } from "@/hooks/useSessionState";
import { participantColors } from "@/utils/sessionHelpers";
import LoadingState from "@/components/session/LoadingState";
import EmptyState from "@/components/session/EmptyState";
import SessionContainer from "@/components/session/SessionContainer";

const Session = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);

  // Handle conversation ID from URL or state
  useEffect(() => {
    const state = location.state as { newConversationId?: number; replace?: boolean } | null;
    
    if (state?.newConversationId) {
      console.log('Setting conversation ID from state:', state.newConversationId);
      setCurrentConversationId(state.newConversationId);
      if (state.replace) {
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
        navigate('/my-facilitators');
      }
    }
  }, [location, queryClient, navigate]);

  // Fetch conversation data
  const { data: conversation, isLoading, error } = useConversation(currentConversationId);

  // Initialize session state
  const sessionState = useSessionState({
    conversationId: currentConversationId,
    welcomeMessage: conversation?.sessions?.welcome_message ?? null
  });

  // Handle conversation fetch error
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

  // Handle message sending
  const handleSendMessage = async () => {
    if (!sessionState.inputMessage.trim() || !currentConversationId) return;

    const currentParticipantKey = `P${sessionState.currentParticipant}`;
    sessionState.setParticipantMessages(prev => ({
      ...prev,
      [currentParticipantKey]: sessionState.inputMessage
    }));

    const updatedMessages = {
      ...sessionState.participantMessages,
      [currentParticipantKey]: sessionState.inputMessage
    };
    const totalParticipants = conversation?.participants ?? 1;
    const allParticipantsResponded = Object.keys(updatedMessages).length === totalParticipants;

    if (allParticipantsResponded) {
      const participantResponses = Object.entries(updatedMessages).map(([participant, content], index) => ({
        id: Date.now().toString() + index,
        content,
        sender: "user" as const,
        participant,
        timestamp: new Date(),
        color: participantColors[participant as keyof typeof participantColors]
      }));

      sessionState.setMessages(prev => [...prev, ...participantResponses]);

      try {
        const messagesForAI = participantResponses.map(msg => ({
          role: "user",
          content: msg.content,
          name: msg.participant,
          conversation_id: currentConversationId,
          user_id: null,
          facilitator_id: conversation?.sessions?.facilitator_details?.id ?? null
        }));

        await supabase.from('messages').insert(messagesForAI);

        const response = await supabase.functions.invoke('handle-facilitator-response', {
          body: {
            messages: [...sessionState.messages, ...messagesForAI],
            conversationId: currentConversationId
          }
        });

        if (response.error) throw new Error(response.error.message || 'Failed to get AI response');
        if (!response.data) throw new Error('No response data received from AI');

        const aiResponse = {
          id: response.data.id || Date.now().toString(),
          content: response.data.content,
          sender: "assistant" as const,
          timestamp: new Date(),
        };
        sessionState.setMessages(prev => [...prev, aiResponse]);
      } catch (error) {
        console.error('Error getting AI response:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to get facilitator's response. Please try again.",
          variant: "destructive",
        });
      }

      sessionState.setParticipantMessages({});
    } else {
      const nextParticipant = sessionState.currentParticipant < totalParticipants ? 
        sessionState.currentParticipant + 1 : 1;
      sessionState.setCurrentParticipant(nextParticipant);
    }

    sessionState.setInputMessage("");
  };

  if (isLoading) return <LoadingState />;
  if (!conversation || !currentConversationId) return <EmptyState />;

  return (
    <SessionContainer
      facilitator={conversation.sessions?.facilitator_details ?? {}}
      objective={conversation.sessions?.objective ?? null}
      participantCount={conversation.participants ?? 1}
      messages={sessionState.messages}
      participantColors={participantColors}
      currentParticipant={sessionState.currentParticipant}
      inputMessage={sessionState.inputMessage}
      isRecording={sessionState.isRecording}
      onParticipantSwitch={sessionState.setCurrentParticipant}
      setInputMessage={sessionState.setInputMessage}
      onSendMessage={handleSendMessage}
      setIsRecording={sessionState.setIsRecording}
      onGenerateReport={sessionState.handleGenerateReport}
      isGeneratingReport={sessionState.isGeneratingReport}
    />
  );
};

export default Session;
