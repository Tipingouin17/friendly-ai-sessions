
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";
import { removeChannel, createUniqueChannelName } from "@/utils/realtimeHelpers";
import { getParticipantColor } from "@/utils/sessionHelpers";
import { nanoid } from "nanoid";

// Define a type for the Supabase payload based on the message structure
interface MessagePayload {
  new: {
    id: string | number;
    content: any; // Could be string or object
    role: string;
    created_at: string;
    conversation_id: number;
  };
  old?: Record<string, any>;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
}

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
      
      console.log(`Setting up realtime subscription for messages in conversation: ${currentConversationId} (${viewMode} view)`);
      
      // Use unique channel name to prevent collisions
      const channelName = createUniqueChannelName(`messages-sync-${currentConversationId}-${viewMode}`);
      
      try {
        const channel = supabase
          .channel(channelName)
          .on('postgres_changes', {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${currentConversationId}`
          }, (payload: any) => {
            if (!mountedRef.current) return;
            
            // Type checking to ensure payload has the expected structure
            if (!payload || !payload.new) {
              console.warn('Received invalid payload:', payload);
              return;
            }
            
            console.log(`New message detected via realtime in ${viewMode} view:`, payload);
            
            try {
              // Extract content from the payload
              let newMessageContent = '';
              let participantId: string | undefined = undefined;
              let isAnonymous = false;
              
              // Safely access content data
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
                } else if ('message' in contentObj) {
                  newMessageContent = contentObj.message as string;
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
              
              if (!payload.new.id) {
                console.warn('Message has no ID:', payload);
                return;
              }
              
              console.log(`Processing realtime message in ${viewMode} view:`, {
                id: payload.new.id,
                content: newMessageContent.substring(0, 20) + "...",
                role: payload.new.role,
                participantId
              });
              
              const newMessage: Message = {
                id: String(payload.new.id) || nanoid(),
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
                    console.log(`Message already exists in ${viewMode} state, not adding duplicate`);
                    return prevMessages;
                  }
                  
                  console.log(`Adding new message to ${viewMode} state:`, {
                    id: newMessage.id,
                    content: newMessage.content.substring(0, 20) + "...",
                    sender: newMessage.sender,
                    participant: newMessage.participant
                  });
                  
                  return [...prevMessages, newMessage];
                });
              }
            } catch (error) {
              console.error(`Error processing new message in ${viewMode} view:`, error);
            }
          })
          .subscribe((status) => {
            console.log(`Message channel subscription status (${viewMode}): ${status}`);
            
            // Handle disconnections explicitly
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              console.log(`Channel error detected in ${viewMode} view, will clean up and restart`);
              
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
        console.error(`Error setting up message channel for ${viewMode}:`, error);
        return null;
      }
      
      return () => {
        if (messageChannelRef.current) {
          console.log(`Cleaning up message sync channel for ${viewMode}`);
          removeChannel(messageChannelRef.current);
          messageChannelRef.current = null;
        }
      };
    };
    
    const cleanup = setupRealtimeListener();
    return cleanup;
  }, [currentConversationId, viewMode, setMessages]);

  // Method to force a refresh of messages from the database
  const forceRefresh = async () => {
    if (!currentConversationId) return;
    
    try {
      console.log(`Forcing message refresh for ${viewMode} view`);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', currentConversationId)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error(`Error fetching messages in ${viewMode} view:`, error);
        return;
      }
      
      if (!data || data.length === 0) {
        console.log(`No messages found for conversation ${currentConversationId} in ${viewMode} view`);
        return;
      }
      
      // Process messages and update state
      const processedMessages = data.map(msg => {
        // Type safety: ensure msg has all expected properties
        if (!msg || typeof msg !== 'object') {
          console.warn('Invalid message in data:', msg);
          return null;
        }
        
        // Extract content data
        let messageContent = '';
        let participantId: string | undefined = undefined;
        let isAnonymous = false;
        
        if (!('content' in msg)) {
          console.warn('Message missing content:', msg);
          messageContent = 'No content';
        } else if (typeof msg.content === 'string') {
          messageContent = msg.content;
        } else if (msg.content && typeof msg.content === 'object') {
          const contentObj = msg.content as Record<string, any>;
          
          if ('text' in contentObj) {
            messageContent = contentObj.text as string;
          } else if ('message' in contentObj) {
            messageContent = contentObj.message as string;
          } else {
            messageContent = JSON.stringify(contentObj);
          }
          
          if ('participant_id' in contentObj) {
            participantId = `P${contentObj.participant_id}`;
          }
          
          isAnonymous = 'is_anonymous' in contentObj ? Boolean(contentObj.is_anonymous) : false;
        }
        
        if (!('id' in msg) || !('role' in msg) || !('created_at' in msg)) {
          console.warn('Message missing required fields:', msg);
          return null;
        }
        
        return {
          id: String(msg.id),
          content: messageContent,
          sender: msg.role === 'assistant' ? 'assistant' : 'user',
          participant: participantId,
          timestamp: new Date(msg.created_at),
          color: participantId ? getParticipantColor(participantId) : undefined,
          isAnonymous,
          likes: []
        } as Message;
      }).filter(Boolean) as Message[]; // Filter out null values
      
      console.log(`Refreshed ${processedMessages.length} messages for ${viewMode} view`);
      setMessages(processedMessages);
      
    } catch (err) {
      console.error(`Error force-refreshing messages for ${viewMode}:`, err);
    }
  };
  
  return { forceRefresh };
};
