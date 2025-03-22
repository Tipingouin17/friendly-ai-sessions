
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";
import { removeChannel, createUniqueChannelName } from "@/utils/realtimeHelpers";
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
  const mountedRef = useRef(true);

  // Set up lifecycle
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Set up real-time listening for new messages
  useEffect(() => {
    const setupRealtimeListener = () => {
      if (!currentConversationId || !mountedRef.current) return null;
      
      // Clean up existing channel if it exists
      if (messageChannelRef.current) {
        removeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
      
      console.log("Setting up realtime subscription for messages in conversation:", currentConversationId);
      
      // Use unique channel name to prevent collisions
      const channelName = createUniqueChannelName(`messages-sync-${currentConversationId}`);
      
      try {
        const channel = supabase
          .channel(channelName)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${currentConversationId}`
          }, (payload) => {
            if (!mountedRef.current) return;
            
            console.log("New message detected via realtime:", payload);
            
            try {
              // Extract content from the payload
              let newMessageContent = '';
              let participantId: string | undefined = undefined;
              let isAnonymous = false;
              
              // Get the content data safely
              const contentData = payload.new.content;
              
              // Handle different content formats
              if (typeof contentData === 'string') {
                newMessageContent = contentData;
              } else if (contentData && typeof contentData === 'object') {
                // Access as a safe record
                const contentObj = contentData as Record<string, any>;
                
                // Get text content
                if ('text' in contentObj) {
                  newMessageContent = contentObj.text as string;
                } else {
                  newMessageContent = JSON.stringify(contentObj);
                }
                
                // Get participant ID if present
                if ('participant_id' in contentObj) {
                  participantId = `P${contentObj.participant_id}`;
                }
                
                // Get anonymous flag if present
                isAnonymous = 'is_anonymous' in contentObj ? Boolean(contentObj.is_anonymous) : false;
              }
              
              console.log("Processing realtime message:", {
                id: payload.new.id,
                content: newMessageContent.substring(0, 20) + "...",
                role: payload.new.role,
                participantId
              });
              
              const newMessage: Message = {
                id: String(payload.new.id),
                content: newMessageContent,
                sender: payload.new.role === 'assistant' ? 'assistant' : 'user',
                participant: participantId,
                timestamp: new Date(payload.new.created_at),
                color: participantId ? getParticipantColor(participantId) : undefined,
                isAnonymous,
                likes: []
              };
              
              // Add to messages state if it doesn't already exist
              if (mountedRef.current) {
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
              }
            } catch (error) {
              console.error("Error processing new message:", error);
            }
          })
          .subscribe((status) => {
            console.log(`Message channel subscription status: ${status}`);
            
            // Handle disconnections explicitly
            if (status === 'CHANNEL_ERROR' || status === 'SUBSCRIPTION_ERROR') {
              console.log("Channel error detected, will clean up and restart");
              
              if (messageChannelRef.current && mountedRef.current) {
                // Clean up then attempt to reconnect after a delay
                removeChannel(messageChannelRef.current);
                messageChannelRef.current = null;
                
                setTimeout(() => {
                  if (mountedRef.current) {
                    setupRealtimeListener();
                  }
                }, 2000);
              }
            }
          });
        
        messageChannelRef.current = channel;
      } catch (error) {
        console.error("Error setting up message channel:", error);
        return null;
      }
      
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
