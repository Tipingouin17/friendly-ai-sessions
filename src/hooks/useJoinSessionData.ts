
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useConversation } from "@/hooks/useConversation";
import { useToast } from "@/components/ui/use-toast";
import { usePlanLimits } from "@/hooks/usePlanLimits";

export function useJoinSessionData(conversationId: number | null) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [participantName, setParticipantName] = useState("");
  const [avatarSeed, setAvatarSeed] = useState(Math.random().toString());
  const [isJoining, setIsJoining] = useState(false);
  const [currentParticipantCount, setCurrentParticipantCount] = useState(0);
  const [maxParticipantsForSession, setMaxParticipantsForSession] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch plan limits as fallback
  const { maxParticipants: planMaxParticipants } = usePlanLimits();
  
  // Fetch conversation data to show facilitator info
  const { data: conversation, isLoading, error: fetchError, refetch } = useConversation(conversationId);

  useEffect(() => {
    if (fetchError) {
      console.error("Error fetching conversation:", fetchError);
      setError(fetchError.message || "Session not found or no longer available");
      toast({
        title: "Error",
        description: "Session not found or no longer available.",
        variant: "destructive",
      });
    }
  }, [fetchError, toast]);

  useEffect(() => {
    // Set conversation-specific data once it's loaded
    if (conversation) {
      console.log("Conversation data loaded:", conversation);
      
      // Set the maximum participants for this specific session
      if (conversation.participants !== null && conversation.participants > 0) {
        setMaxParticipantsForSession(conversation.participants);
      }
      
      // Set the current participants count
      if (conversation.current_participants !== null && conversation.current_participants >= 0) {
        setCurrentParticipantCount(conversation.current_participants);
      }
    }
  }, [conversation]);

  useEffect(() => {
    // Set up real-time subscription to track changes to participants
    if (conversationId) {
      console.log("Setting up realtime subscription for conversation:", conversationId);
      
      const channel = supabase
        .channel(`conversation-updates-${conversationId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          console.log("Received realtime update:", payload);
          
          if (payload.new) {
            // Update max participants if available
            if (payload.new.participants !== null && payload.new.participants > 0) {
              setMaxParticipantsForSession(payload.new.participants);
            }
            
            // Update current participants count
            if (payload.new.current_participants !== null && payload.new.current_participants >= 0) {
              setCurrentParticipantCount(payload.new.current_participants);
              
              // Force refetch conversation data to ensure we have latest state
              refetch();
            }
          }
        })
        .subscribe((status) => {
          console.log(`Channel status: ${status}`);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to realtime updates');
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, refetch]);

  const navigateToSession = (name: string, participantId: number) => {
    console.log(`Navigating to session with name: ${name}, participantId: ${participantId}`);
    
    navigate(`/session?id=${conversationId}`, {
      state: { 
        participantName: name,
        avatarSeed,
        isGuest: true,
        participantId
      }
    });
  };

  const handleJoinSession = async () => {
    if (!participantName.trim()) {
      toast({
        title: "Please enter your name",
        description: "A name is required to join the session.",
        variant: "destructive",
      });
      return;
    }

    // Use session-specific max or fall back to plan limit
    const effectiveMaxParticipants = maxParticipantsForSession > 0 ? 
      maxParticipantsForSession : planMaxParticipants;

    // Check if the session is full
    if (currentParticipantCount >= effectiveMaxParticipants && effectiveMaxParticipants > 0) {
      toast({
        title: "Session is full",
        description: `This session has reached its maximum capacity of ${effectiveMaxParticipants} participants.`,
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      // Force refresh data before joining to ensure we have latest count
      await refetch();
      
      console.log("Current participant count before update:", currentParticipantCount);
      
      // Increment the current participant count in the conversation
      const { data, error: updateError } = await supabase
        .from('conversations')
        .update({ 
          current_participants: (conversation?.current_participants || 0) + 1 
        })
        .eq('id', conversationId)
        .select('current_participants')
        .single();
        
      if (updateError) {
        console.error("Error updating participant count:", updateError);
        setError(updateError.message);
        throw updateError;
      }

      console.log("Update response:", data);
      
      // Use the returned current_participants value as the participant ID to ensure uniqueness
      const newParticipantId = data?.current_participants || ((conversation?.current_participants || 0) + 1);
      
      // Add a short delay to allow for Supabase to process the update
      setTimeout(() => {
        navigateToSession(participantName, newParticipantId);
      }, 500);
      
    } catch (error: any) {
      console.error("Error joining session:", error);
      setError(error.message || "Failed to join the session");
      toast({
        title: "Error",
        description: "Failed to join the session. Please try again.",
        variant: "destructive",
      });
      setIsJoining(false);
    }
  };
  
  // Calculate effective max participants
  const effectiveMaxParticipants = maxParticipantsForSession > 0 ? 
    maxParticipantsForSession : planMaxParticipants;
    
  // Only consider full if the max is greater than 0 and we've reached it
  const isFull = effectiveMaxParticipants > 0 && currentParticipantCount >= effectiveMaxParticipants;

  return {
    participantName,
    setParticipantName,
    avatarSeed,
    setAvatarSeed,
    isJoining,
    currentParticipantCount,
    effectiveMaxParticipants,
    isFull,
    conversation,
    isLoading,
    error,
    handleJoinSession,
    navigateToSession
  };
}
