
import { supabase } from "@/integrations/supabase/client";

/**
 * Safely removes a Supabase channel subscription
 * @param channel The channel to remove
 */
export const removeChannel = (channel: any) => {
  if (channel && typeof channel.unsubscribe === 'function') {
    try {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    } catch (err) {
      console.error("Error removing channel:", err);
    }
  }
};

/**
 * Safely removes multiple Supabase channel subscriptions
 * @param channels Array of channels to remove
 */
export const removeChannels = (channels: any[]) => {
  if (channels && channels.length > 0) {
    console.log(`Cleaning up ${channels.length} realtime channels`);
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
  console.log(`Creating conversation channel for ID: ${conversationId}`);
  
  return supabase
    .channel(`conversation-${conversationId}`)
    .on('postgres_changes', { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'conversations',
      filter: `id=eq.${conversationId}`
    }, onUpdate)
    .subscribe();
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
  console.log(`Creating participants channel for ID: ${conversationId}`);
  
  return supabase
    .channel(`participants-${conversationId}`)
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'session_participants',
      filter: `conversation_id=eq.${conversationId}`
    }, onParticipantJoin)
    .subscribe();
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
  console.log(`Creating messages channel for ID: ${conversationId}`);
  
  return supabase
    .channel(`messages-${conversationId}`)
    .on('postgres_changes', {
      event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, onMessageChange)
    .subscribe();
};
