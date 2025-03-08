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
import ParticipantSetup from "@/components/session/ParticipantSetup";
import { ParticipantInfo } from "@/types/chat";

const Session = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  
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
    welcomeMessage: conversation?.sessions?.welcome_message ?? null
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

  const handleSetupComplete = (setupParticipants: ParticipantInfo[]) => {
    setParticipants(setupParticipants);
    setSetupComplete(true);
  };

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
      const participantResponses = Object.entries(updatedMessages).map(([participant, content], index) => {
        const participantNumber = parseInt(participant.slice(1));
        const participantInfo = participants.find(p => p.id === participantNumber);
        
        return {
          id: Date.now().toString() + index,
          content,
          sender: "user" as const,
          participant,
          timestamp: new Date(),
          color: participantColors[participant as keyof typeof participantColors],
          avatar: participantInfo?.avatar
        };
      });

      sessionState.setMessages(prev => [...prev, ...participantResponses]);
      setIsWaitingForResponse(true);

      try {
        console.log('Calling edge function with:', {
          conversationId: currentConversationId,
          messages: [...sessionState.messages, ...participantResponses]
        });

        const response = await supabase.functions.invoke('handle-facilitator-response', {
          body: {
            messages: [...sessionState.messages, ...participantResponses],
            conversationId: currentConversationId
          }
        });

        console.log('Edge function response:', response);

        if (response.error) throw new Error(response.error.message || 'Failed to get AI response');
        if (!response.data) throw new Error('No response data received from AI');

        const aiResponse = {
          id: response.data.id || Date.now().toString(),
          content: response.data.content,
          sender: "assistant" as const,
          timestamp: new Date(),
          avatar: conversation?.sessions?.facilitator_details?.profile_picture || null
        };
        sessionState.setMessages(prev => [...prev, aiResponse]);
      } catch (error) {
        console.error('Error getting AI response:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to get facilitator's response. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsWaitingForResponse(false);
      }

      sessionState.setParticipantMessages({});
    } else {
      const nextParticipant = sessionState.currentParticipant < totalParticipants ? 
        sessionState.currentParticipant + 1 : 1;
      sessionState.setCurrentParticipant(nextParticipant);
    }

    sessionState.setInputMessage("");
  };

  const handleLikeMessage = (messageId: string) => {
    const currentParticipantId = `P${sessionState.currentParticipant}`;
    
    sessionState.setMessages(prev => 
      prev.map(message => {
        if (message.id === messageId) {
          const currentLikes = message.likes || [];
          const alreadyLiked = currentLikes.includes(currentParticipantId);
          
          return {
            ...message,
            likes: alreadyLiked 
              ? currentLikes.filter(id => id !== currentParticipantId) 
              : [...currentLikes, currentParticipantId]
          };
        }
        return message;
      })
    );
  };

  if (isLoading) return <LoadingState />;
  if (!conversation || !currentConversationId) return <EmptyState />;

  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center py-12">
        <ParticipantSetup 
          participantCount={conversation.participants ?? 1}
          onComplete={handleSetupComplete}
          facilitatorTitle={conversation.sessions?.facilitator_details?.title}
        />
      </div>
    );
  }

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
      isWaitingForResponse={isWaitingForResponse}
      onParticipantSwitch={sessionState.setCurrentParticipant}
      setInputMessage={sessionState.setInputMessage}
      onSendMessage={handleSendMessage}
      setIsRecording={sessionState.setIsRecording}
      onGenerateReport={sessionState.handleGenerateReport}
      isGeneratingReport={sessionState.isGeneratingReport}
      onLikeMessage={handleLikeMessage}
      participants={participants}
      conversationId={currentConversationId}
    />
  );
};

export default Session;
