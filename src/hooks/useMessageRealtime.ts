
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";

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
          
          if (payload.new && viewMode === "admin") {
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
              setMessages(prevMessages => {
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
  }, [currentConversationId, viewMode, setMessages]);
};
