
import { supabase } from "@/integrations/supabase/client";
import { removeChannel, createUniqueChannelName, createReliableChannel } from "./realtimeHelpers";

/**
 * Enhanced realtime connection manager with improved error handling and monitoring
 */

/**
 * Safely removes multiple Supabase channel subscriptions
 * @param channels Array of channels to remove
 */
export const removeChannels = (channels: any[]) => {
  if (channels && channels.length > 0) {
    console.log(`Cleaning up ${channels.length} realtime channels`);
    channels.forEach(channel => {
      try {
        removeChannel(channel);
      } catch (error) {
        console.error('Error removing channel:', error);
      }
    });
  }
};

/**
 * Creates a channel for tracking conversation updates with enhanced error handling
 * @param conversationId The ID of the conversation to track
 * @param onUpdate Callback for updates
 * @returns The created channel
 */
export const createConversationChannel = (
  conversationId: number,
  onUpdate: (payload: any) => void
) => {
  console.log(`Creating enhanced conversation channel for ID: ${conversationId}`);
  
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
      }, (payload) => {
        try {
          console.log(`Enhanced conversation update for ${conversationId}:`, payload);
          onUpdate(payload);
        } catch (error) {
          console.error('Error in conversation update handler:', error);
        }
      })
      .subscribe((status) => {
        console.log(`Enhanced conversation channel subscription status: ${status}`);
        if (status === 'CHANNEL_ERROR') {
          console.error('Conversation channel subscription failed');
        } else if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to conversation updates');
        }
      });
  } catch (error) {
    console.error("Error creating conversation channel:", error);
    return null;
  }
};

/**
 * Creates a channel for tracking participant updates with enhanced error handling
 * @param conversationId The ID of the conversation
 * @param onParticipantJoin Callback for when a participant joins
 * @returns The created channel
 */
export const createParticipantsChannel = (
  conversationId: number,
  onParticipantJoin: (payload: any) => void
) => {
  console.log(`Creating enhanced participants channel for ID: ${conversationId}`);
  
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
      }, (payload) => {
        try {
          console.log(`Enhanced participant join for ${conversationId}:`, payload);
          onParticipantJoin(payload);
        } catch (error) {
          console.error('Error in participant join handler:', error);
        }
      })
      .subscribe((status) => {
        console.log(`Enhanced participants channel subscription status: ${status}`);
        if (status === 'CHANNEL_ERROR') {
          console.error('Participants channel subscription failed');
        } else if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to participant updates');
        }
      });
  } catch (error) {
    console.error("Error creating participants channel:", error);
    return null;
  }
};

/**
 * Creates a channel for tracking message updates with enhanced error handling
 * @param conversationId The ID of the conversation
 * @param onMessageChange Callback for when messages change
 * @returns The created channel
 */
export const createMessagesChannel = (
  conversationId: number,
  onMessageChange: (payload: any) => void
) => {
  console.log(`Creating enhanced messages channel for ID: ${conversationId}`);
  
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
      }, (payload) => {
        try {
          console.log(`Enhanced message change for ${conversationId}:`, payload);
          onMessageChange(payload);
        } catch (error) {
          console.error('Error in message change handler:', error);
        }
      })
      .subscribe((status) => {
        console.log(`Enhanced messages channel subscription status: ${status}`);
        if (status === 'CHANNEL_ERROR') {
          console.error('Messages channel subscription failed');
        } else if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to message updates');
        }
      });
  } catch (error) {
    console.error("Error creating messages channel:", error);
    return null;
  }
};

/**
 * Health check for realtime connections
 * @param channels Array of channels to check
 * @returns Health status object
 */
export const checkConnectionHealth = (channels: any[]) => {
  const healthStatus = {
    totalChannels: channels.length,
    subscribedChannels: 0,
    errorChannels: 0,
    closedChannels: 0
  };

  channels.forEach(channel => {
    if (channel && channel.state) {
      switch (channel.state) {
        case 'joined':
          healthStatus.subscribedChannels++;
          break;
        case 'errored':
          healthStatus.errorChannels++;
          break;
        case 'closed':
          healthStatus.closedChannels++;
          break;
      }
    }
  });

  return healthStatus;
};
