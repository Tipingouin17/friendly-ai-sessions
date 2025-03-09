
import { useState, useCallback, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";
import { participantColors } from "@/utils/sessionHelpers";
import { nanoid } from "nanoid";

type UseSessionInteractionsProps = {
  currentConversationId: number | null;
  sessionState: {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    inputMessage: string;
    setInputMessage: (message: string) => void;
    currentParticipant: number;
    recordResponse: (participantId: number, hasResponded: boolean) => void;
    totalResponses: number;
    hasAnswered: boolean;
    viewMode: "participant" | "admin";
  };
  conversation: any;
  participants: any[];
  isAnonymous: boolean;
};

export const useSessionInteractions = ({
  currentConversationId,
  sessionState,
  conversation,
  participants,
  isAnonymous
}: UseSessionInteractionsProps) => {
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [error, setError] = useState<string | null>(null); // Add error state
  const { toast } = useToast();
  const requestInProgressRef = useRef(false);
  const messageChannelRef = useRef<any>(null);

  // Set up real-time listening for new messages
  useEffect(() => {
    const setupRealtimeListener = () => {
      if (!currentConversationId) return null;
      
      // Clean up existing channel if it exists
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
      
      console.log("Setting up realtime subscription for messages in conversation:", currentConversationId);
      
      const channel = supabase
        .channel(`messages-sync-${currentConversationId}-${Date.now()}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${currentConversationId}`
        }, (payload) => {
          console.log("New message detected:", payload);
          
          if (payload.new && sessionState.viewMode === "admin") {
            // For admin view, we need to update our messages state
            // This ensures admin sees messages from all participants in real-time
            try {
              const newMessageContent = typeof payload.new.content === 'string' 
                ? payload.new.content 
                : JSON.stringify(payload.new.content);
              
              const newMessage: Message = {
                id: payload.new.id.toString(),
                content: newMessageContent,
                sender: payload.new.role === 'assistant' ? 'assistant' : 'user',
                timestamp: new Date(payload.new.created_at),
                likes: []
              };
              
              // Add to messages state if it doesn't already exist
              sessionState.setMessages(prevMessages => {
                if (prevMessages.some(msg => msg.id === newMessage.id)) {
                  return prevMessages;
                }
                return [...prevMessages, newMessage];
              });
            } catch (error) {
              console.error("Error processing new message:", error);
            }
          }
        })
        .subscribe();
      
      messageChannelRef.current = channel;
      
      return () => {
        if (messageChannelRef.current) {
          console.log("Cleaning up message sync channel");
          supabase.removeChannel(messageChannelRef.current);
          messageChannelRef.current = null;
        }
      };
    };
    
    const cleanup = setupRealtimeListener();
    return cleanup;
  }, [currentConversationId, sessionState.viewMode, sessionState.setMessages]);

  const handleSendMessage = useCallback(async () => {
    // Prevent concurrent requests
    if (requestInProgressRef.current || isWaitingForResponse) {
      console.log("Request already in progress, ignoring duplicate send");
      return;
    }
    
    // Don't allow sending in admin view
    if (sessionState.viewMode === "admin") return;
    
    if (!sessionState.inputMessage.trim() || !currentConversationId) return;

    // Get the current participant info
    const currentParticipant = sessionState.currentParticipant;
    const currentParticipantKey = `P${currentParticipant}`;
    const participantInfo = participants.find(p => p.id === currentParticipant);
    
    // Create the message object
    const messageId = nanoid();
    const newMessage = {
      id: messageId,
      content: sessionState.inputMessage,
      sender: "user" as const,
      participant: currentParticipantKey,
      timestamp: new Date(),
      color: participantColors[currentParticipantKey] || "#CCCCCC",
      avatar: participantInfo?.avatar,
      isAnonymous: isAnonymous
    };

    // Add the participant's message to the displayed messages
    sessionState.setMessages(prev => [...prev, newMessage]);
    
    try {
      // Store message in database for sync
      await supabase.from('messages').insert({
        conversation_id: currentConversationId,
        content: sessionState.inputMessage,
        role: 'user',
        name: participantInfo?.name || `Participant ${currentParticipant}`,
        user_id: null // For anonymous participants
      });
    } catch (error) {
      console.error("Error saving message to database:", error);
      setError("Failed to save message. Please try again.");
    }
    
    // Clear the input message
    sessionState.setInputMessage("");
    
    // Record this participant has responded - after adding the message
    sessionState.recordResponse(currentParticipant, true);
    
    // Check if we have responses from all participants
    const totalParticipants = conversation?.participants ?? 1;
    const updatedTotalResponses = sessionState.totalResponses + 1;
    
    console.log("Total expected participants:", totalParticipants);
    console.log("Current total responses:", updatedTotalResponses);
    console.log("This participant's hasAnswered:", sessionState.hasAnswered);
    
    // If all participants have responded, send to facilitator
    if (updatedTotalResponses >= totalParticipants) {
      requestInProgressRef.current = true;
      setIsWaitingForResponse(true);

      try {
        // Get all participant messages for this round - only the most recent messages
        const participantMessages = sessionState.messages.filter(msg => 
          msg.sender === "user" && msg.participant && msg.participant.startsWith('P')
        ).slice(-totalParticipants);
        
        console.log('Calling edge function with participant messages count:', participantMessages.length);

        const response = await supabase.functions.invoke('handle-facilitator-response', {
          body: {
            messages: sessionState.messages,
            conversationId: currentConversationId
          }
        });

        if (response.error) throw new Error(response.error.message || 'Failed to get AI response');
        if (!response.data) throw new Error('No response data received from AI');

        const aiResponse = {
          id: response.data.id || nanoid(),
          content: response.data.content,
          sender: "assistant" as const,
          timestamp: new Date(),
          avatar: conversation?.sessions?.facilitator_details?.profile_picture || null
        };
        
        // Save AI response to database
        try {
          await supabase.from('messages').insert({
            conversation_id: currentConversationId,
            content: aiResponse.content,
            role: 'assistant',
            user_id: null
          });
        } catch (error) {
          console.error("Error saving AI response to database:", error);
          setError("Failed to save AI response. Please try again.");
        }
        
        sessionState.setMessages(prev => [...prev, aiResponse]);
      } catch (error) {
        console.error('Error getting AI response:', error);
        const errorMessage = error instanceof Error ? error.message : "Failed to get facilitator's response. Please try again.";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsWaitingForResponse(false);
        requestInProgressRef.current = false;
      }
    }
  }, [
    isWaitingForResponse, 
    sessionState, 
    currentConversationId, 
    participants, 
    isAnonymous, 
    conversation?.participants,
    conversation?.sessions?.facilitator_details?.profile_picture,
    toast
  ]);

  const handleLikeMessage = useCallback((messageId: string) => {
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
  }, [sessionState]);

  return {
    isWaitingForResponse,
    handleSendMessage,
    handleLikeMessage,
    error // Add the error property to the return object
  };
};
