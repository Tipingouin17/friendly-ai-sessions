
import { supabase } from "@/integrations/supabase/client";
import { removeChannel } from "@/utils/realtimeHelpers";

/**
 * Creates a lightweight channel to test connection to Supabase
 * @param conversationId The conversation ID
 * @returns A promise that resolves to true if connection is successful
 */
export const createPingChannel = async (conversationId: number): Promise<boolean> => {
  console.log("Creating ping channel to test connection...");
  
  // Create a lightweight ping channel
  const channelName = `ping-${conversationId}-${Date.now()}`;
  let pingChannel = null;
  
  try {
    // Create a promise that resolves when subscription succeeds
    const pingPromise = new Promise<boolean>((resolve) => {
      const timeoutId = setTimeout(() => resolve(false), 5000);
      
      try {
        const channel = supabase
          .channel(channelName)
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timeoutId);
              resolve(true);
            } else if (status === 'TIMED_OUT' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              clearTimeout(timeoutId);
              resolve(false);
            }
          });
        
        pingChannel = channel;
      } catch (err) {
        clearTimeout(timeoutId);
        resolve(false);
      }
    });
    
    // Wait for ping result
    const pingResult = await pingPromise;
    
    // Clean up ping channel
    if (pingChannel) {
      removeChannel(pingChannel);
    }
    
    return pingResult;
  } catch (err) {
    console.error("Error in ping channel:", err);
    
    // Clean up ping channel
    if (pingChannel) {
      removeChannel(pingChannel);
    }
    
    return false;
  }
};

/**
 * Performs a simple database query to check connection
 * @param conversationId The conversation ID
 * @returns A promise that resolves to true if connection is successful
 */
export const performDatabasePing = async (conversationId: number): Promise<boolean> => {
  try {
    // Simple ping to check connection with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    // Create the request
    const query = supabase.from('conversations')
      .select('id')
      .eq('id', conversationId)
      .limit(1)
      .maybeSingle();
      
    // Manually handle the AbortController
    const signal = controller.signal;
    const abortPromise = new Promise((_, reject) => {
      signal.addEventListener('abort', () => {
        reject(new Error('Request aborted due to timeout'));
      });
    });
    
    // Race the query against the abort promise
    const { data, error } = await Promise.race([
      query,
      abortPromise.then(() => {
        throw new Error('Request timed out');
      })
    ]).catch(err => {
      console.error("Connection check error:", err);
      return { data: null, error: err };
    }) as { data: any, error: any };
    
    clearTimeout(timeoutId);
    
    if (error) {
      console.error("Database ping failed:", error);
      return false;
    } 
    
    if (data) {
      console.log("Database ping successful:", data);
      return true;
    }
    
    return false;
  } catch (err) {
    console.error("Error in database ping:", err);
    return false;
  }
};
