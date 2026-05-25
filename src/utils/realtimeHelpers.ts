/**
 * realtime Helpers
 *
 * Utility for the AIfacilitator application.
 */

import api from "@/lib/api";

/**
 * Safely removes a Supabase channel subscription
 * @param channel The channel to remove
 */
const swallowExpectedRemovalError = (err: unknown) => {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  if (/aborted|unsubscribe|closed/i.test(message)) return;
  console.error("Error removing channel:", err);
};

export const removeChannel = (channel: any) => {
  if (!channel) return;
  
  try {
    if (typeof channel.unsubscribe === 'function') {
      void Promise.resolve(channel.unsubscribe()).catch(swallowExpectedRemovalError);
    }
    
    if (api && typeof api.removeChannel === 'function') {
      void Promise.resolve(api.removeChannel(channel)).catch(swallowExpectedRemovalError);
    }
  } catch (err) {
    swallowExpectedRemovalError(err);
  }
};

/**
 * Check if a channel is active and properly subscribed
 * @param channel The channel to check
 * @returns boolean indicating if channel is active
 */
export const isChannelActive = (channel: any): boolean => {
  return channel && typeof channel.unsubscribe === 'function';
};

/**
 * Creates a unique channel name to prevent collisions
 * @param baseName Base name for the channel
 * @returns Unique channel name
 */
export const createUniqueChannelName = (baseName: string): string => {
  return `${baseName}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Creates a channel with proper error handling and retry support
 * @param channelName Base name for the channel
 * @param options Additional options
 * @returns The created channel
 */
export const createReliableChannel = (channelName: string, options = { maxRetries: 3 }) => {
  const uniqueChannelName = createUniqueChannelName(channelName);
  let retryCount = 0;
  let channel = null;
  
  const createChannel = () => {
    try {
      channel = api.channel(uniqueChannelName);
      
      // Add status handling
      channel.on('system', { event: 'disconnect' }, () => {
        
        if (retryCount < options.maxRetries) {
          retryCount++;
          
          // Clean up the existing channel first
          try {
            removeChannel(channel);
          } catch (e) {
            console.error("Error during channel cleanup:", e);
          }
          
          // Create a new channel with delay
          setTimeout(createChannel, 1000 * retryCount);
        }
      });
      
      return channel;
    } catch (error) {
      console.error("Error creating channel:", error);
      return null;
    }
  };
  
  return createChannel();
};
