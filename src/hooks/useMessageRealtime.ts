
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";
import { removeChannel } from "@/utils/realtimeHelpers";
import { getParticipantColor } from "@/utils/sessionHelpers";

type UseMessageRealtimeProps = {
  currentConversationId: number | null;
  viewMode: "participant" | "admin";
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
};

export const useMessageRealtime = ({
  currentConversationId,
  viewMode,
  setMessages
}: UseMessageRealtimeProps) => {
  const messageChannelRef = useRef<any>(null);

  // Set up real-time listening for new messages
  useEffect(() => {
    const setupRealtimeListener = () => {
      if (!currentConversationId) return null;
      
      // Clean up existing channel if it exists
      if (messageChannelRef.current) {
        removeChannel(messageChannelRef.current);
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
          console.log("New message detected via realtime:", payload);
          
          try {
            // Extract content from the jsonb field
            const contentData = payload.new.content || {};
            
            // Support both formats - direct text or content.text
            const newMessageContent = typeof contentData === 'object' && contentData.text 
              ? contentData.text 
              : (typeof payload.new.content === 'string' 
                  ? payload.new.content 
                  : JSON.stringify(payload.new.content));
            
            // Extract participant ID from content if available
            const participantId = contentData.participant_id 
              ? contentData.participant_id 
              : null;
              
            // Create participant key if available
            const participantKey = participantId ? `P${participantId}` : undefined;
            
            console.log("Processing realtime message:", {
              id: payload.new.id,
              content: newMessageContent.substring(0, 20) + "...",
              role: payload.new.role,
              participantKey
            });
            
            const newMessage: Message = {
              id: String(payload.new.id),
              content: newMessageContent,
              sender: payload.new.role === 'assistant' ? 'assistant' : 'user',
              participant: participantKey,
              timestamp: new Date(payload.new.created_at),
              color: participantKey ? getParticipantColor(participantKey) : undefined,
              isAnonymous: contentData.is_anonymous || false,
              likes: []
            };
            
            // Add to messages state if it doesn't already exist
            setMessages(prevMessages => {
              // Check if this message already exists in our state
              if (prevMessages.some(msg => msg.id === String(payload.new.id))) {
                console.log("Message already exists in state, not adding duplicate");
                return prevMessages;
              }
              
              console.log("Adding new message to state:", {
                id: newMessage.id,
                content: newMessage.content.substring(0, 20) + "...",
                sender: newMessage.sender,
                participant: newMessage.participant
              });
              
              return [...prevMessages, newMessage];
            });
          } catch (error) {
            console.error("Error processing new message:", error);
          }
        })
        .subscribe((status) => {
          console.log(`Message channel subscription status: ${status}`);
        });
      
      messageChannelRef.current = channel;
      
      return () => {
        if (messageChannelRef.current) {
          console.log("Cleaning up message sync channel");
          removeChannel(messageChannelRef.current);
          messageChannelRef.current = null;
        }
      };
    };
    
    const cleanup = setupRealtimeListener();
    return cleanup;
  }, [currentConversationId, viewMode, setMessages]);
};
