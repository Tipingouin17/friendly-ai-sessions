import React, { useState, useEffect, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useConversation } from "@/hooks/useConversation";
import { useSessionState } from "@/hooks/useSessionState";
import { ParticipantInfo } from "@/types/chat";
import { participantColors } from "@/utils/sessionHelpers";
import { SessionContextProps } from "@/types/session";

interface SessionProviderProps {
  children: (props: SessionContextProps) => React.ReactElement;
  handleSessionFull?: () => void;
}

export const SessionProvider = ({ children, handleSessionFull }: SessionProviderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [sessionLink, setSessionLink] = useState('');
  const [showQrCodeView, setShowQrCodeView] = useState(true);
  
  const isMobile = window.innerWidth < 768;
  
  useEffect(() => {
    console.log("Session page loaded with state:", location.state);
    
    const state = location.state as { 
      newConversationId?: number; 
      replace?: boolean; 
      participantName?: string; 
      avatarSeed?: string;
      isGuest?: boolean;
      participantId?: number;
    } | null;
    
    if (state?.isGuest) {
      console.log("Guest participant joining with data:", state);
      setShowQrCodeView(false);
      
      if (state.participantName && state.participantId) {
        const avatarUrl = state.avatarSeed 
          ? `/api/avatar?name=${state.avatarSeed}&variant=beam&palette=0` 
          : null;
          
        setParticipants(prev => {
          const exists = prev.some(p => p.id === state.participantId);
          if (exists) return prev;
          
          console.log("Adding participant with ID:", state.participantId);
          return [...prev, {
            id: state.participantId!,
            name: state.participantName!,
            avatar: avatarUrl
          }];
        });
      }
    }
    
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
        queryClient.invalidateQueries({ queryKey: ['conversation', Number(conversationId)] });
      } else {
        console.log('No conversation ID found in state or URL');
        navigate('/');
      }
    }
  }, [location, queryClient, navigate]);

  useEffect(() => {
    if (currentConversationId) {
      const baseUrl = window.location.origin;
      setSessionLink(`${baseUrl}/join-session?id=${currentConversationId}`);
    }
  }, [currentConversationId]);

  const { data: conversation, isLoading, error, refetch } = useConversation(currentConversationId);

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
      navigate('/');
    }
  }, [error, navigate, toast]);

  useEffect(() => {
    if (conversation && conversation.current_participants > 0) {
      if (conversation.current_participants > participants.length) {
        console.log("Updating participants based on conversation data:", conversation.current_participants);
        
        const updatedParticipants = [...participants];
        
        for (let i = updatedParticipants.length + 1; i <= conversation.current_participants; i++) {
          if (!updatedParticipants.some(p => p.id === i)) {
            updatedParticipants.push({
              id: i,
              name: `Participant ${i}`,
              avatar: null
            });
          }
        }
        
        setParticipants(updatedParticipants);
      }
    }
  }, [conversation, participants]);

  useEffect(() => {
    if (isMobile && location.state?.isGuest) {
      setShowQrCodeView(false);
    }
  }, [isMobile, location.state]);

  useEffect(() => {
    if (currentConversationId) {
      console.log("Setting up realtime subscription for participants in Session page");
      
      const channel = supabase
        .channel(`participants-${currentConversationId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations',
          filter: `id=eq.${currentConversationId}`
        }, (payload) => {
          console.log("Received realtime update for participants in Session page:", payload);
          
          if (payload.new && payload.new.current_participants !== undefined) {
            const currentCount = payload.new.current_participants;
            
            if (currentCount > participants.length) {
              const newParticipants = [...participants];
              for (let i = participants.length + 1; i <= currentCount; i++) {
                if (!newParticipants.some(p => p.id === i)) {
                  newParticipants.push({
                    id: i,
                    name: `Participant ${i}`,
                    avatar: null
                  });
                }
              }
              setParticipants(newParticipants);
            }
            
            if (currentCount >= (conversation?.participants || 0) && (conversation?.participants || 0) > 0) {
              if (handleSessionFull) {
                handleSessionFull();
              }
            }
            
            refetch();
          }
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentConversationId, participants, refetch, conversation, handleSessionFull]);

  const handleStartSession = () => {
    setShowQrCodeView(false);
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
    const allParticipantsResponded = Object.keys(updatedMessages).length >= totalParticipants;

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

  const sessionContext: SessionContextProps = {
    isLoading,
    conversation,
    currentConversationId,
    sessionState,
    participants,
    participantColors,
    isWaitingForResponse,
    handleStartSession,
    handleSendMessage,
    handleLikeMessage,
    showQrCodeView,
    sessionLink
  };

  return (
    <>
      {children && children(sessionContext)}
    </>
  );
};
