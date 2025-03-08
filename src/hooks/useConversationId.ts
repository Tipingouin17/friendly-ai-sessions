
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

export function useConversationId() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  
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
  
  return {
    currentConversationId,
    locationState: location.state
  };
}
