
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { ParticipantInfo } from "@/types/chat";
import { useConversation } from "@/hooks/useConversation";

export const useSessionData = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
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

  const handleStartSession = () => {
    setShowQrCodeView(false);
  };

  return {
    currentConversationId,
    participants,
    setParticipants,
    sessionLink,
    showQrCodeView,
    conversation,
    isLoading,
    refetch,
    handleStartSession,
  };
};
