
import { supabase } from "@/integrations/supabase/client";
import { removeChannel, createUniqueChannelName, createReliableChannel } from "./realtimeHelpers";

/**
 * Safely removes multiple Supabase channel subscriptions
 * @param channels Array of channels to remove
 */
export const removeChannels = (channels: any[]) => {
  if (channels && channels.length > 0) {
    //console.log(`Cleaning up ${channels.length} realtime channels`);
    channels.forEach(channel => removeChannel(channel));
  }
};

/**
 * Creates a channel for tracking conversation updates
 * @param conversationId The ID of the conversation to track
 * @param onUpdate Callback for updates
 * @returns The created channel
 */
export const createConversationChannel = (
  conversationId: number,
  onUpdate: (payload: any) => void
) => {
  //console.log(`Creating conversation channel for ID: ${conversationId}`);
  
  // Use unique channel name to prevent collisions
  const channelName = createUniqueChannelName(`conversation-${conversationId}`);
  
  try {
    return supabase
      .channel(channelName)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, onUpdate)
      .subscribe((status) => {
        //console.log(`Conversation channel subscription status: ${status}`);
      });
  } catch (error) {
    //console.error("Error creating conversation channel:", error);
    return null;
  }
};

/**
 * Creates a channel for tracking participant updates
 * @param conversationId The ID of the conversation
 * @param onParticipantJoin Callback for when a participant joins
 * @returns The created channel
 */
export const createParticipantsChannel = (
  conversationId: number,
  onParticipantJoin: (payload: any) => void
) => {
  //console.log(`Creating participants channel for ID: ${conversationId}`);
  
  // Use unique channel name to prevent collisions
  const channelName = createUniqueChannelName(`participants-${conversationId}`);
  
  try {
    return supabase
      .channel(channelName)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'session_participants',
        filter: `conversation_id=eq.${conversationId}`
      }, onParticipantJoin)
      .subscribe((status) => {
        console.log(`Participants channel subscription status: ${status}`);
      });
  } catch (error) {
    //console.error("Error creating participants channel:", error);
    return null;
  }
};

/**
 * Creates a channel for tracking message updates
 * @param conversationId The ID of the conversation
 * @param onMessageChange Callback for when messages change
 * @returns The created channel
 */
export const createMessagesChannel = (
  conversationId: number,
  onMessageChange: (payload: any) => void
) => {
  //console.log(`Creating messages channel for ID: ${conversationId}`);
  
  // Use unique channel name to prevent collisions
  const channelName = createUniqueChannelName(`messages-${conversationId}`);
  
  try {
    return supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, onMessageChange)
      .subscribe((status) => {
        //console.log(`Messages channel subscription status: ${status}`);
      });
  } catch (error) {
    //console.error("Error creating messages channel:", error);
    return null;
  }
};
