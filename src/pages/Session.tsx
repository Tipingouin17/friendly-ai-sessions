
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
import { Conversation } from "@/types/database";

const Session = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);

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

  const { data: conversation, isLoading, error } = useConversation(currentConversationId);

  const sessionState = useSessionState({
    conversationId: currentConversationId,
    welcomeMessage: conversation?.sessions?.welcome_message
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

  if (isLoading) return <LoadingState />;
  if (!conversation || !currentConversationId) return <EmptyState />;

  return (
    <SessionContainer
      facilitator={conversation.sessions.facilitator}
      objective={conversation.sessions.objective}
      participantCount={conversation.participants || 1}
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
