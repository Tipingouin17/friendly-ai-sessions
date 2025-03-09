
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
