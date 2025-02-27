
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

  // Handle participant setup completion
  const handleSetupComplete = (setupParticipants: ParticipantInfo[]) => {
    setParticipants(setupParticipants);
    setSetupComplete(true);
  };

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

  // If setup is not complete, show the participant setup screen
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
    />
  );
};

export default Session;
