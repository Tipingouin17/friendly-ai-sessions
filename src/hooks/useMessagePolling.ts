
import { useEffect, useRef, useCallback } from 'react';
import { debugLog } from '@/utils/debugLogger';

interface UseMessagePollingProps {
  fetchMessages: () => Promise<void>;
  isSessionJustStarted: boolean;
  enabled: boolean;
}

export const useMessagePolling = ({
  fetchMessages,
  isSessionJustStarted,
  enabled
}: UseMessagePollingProps) => {
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const maxPolls = 10; // Poll for up to 30 seconds (3s intervals)

  const startPolling = useCallback(() => {
    if (!enabled || pollingIntervalRef.current) return;

    debugLog('all', 'Starting message polling for session start');
    pollCountRef.current = 0;

    pollingIntervalRef.current = setInterval(async () => {
      pollCountRef.current++;
      debugLog('all', `Polling for messages - attempt ${pollCountRef.current}`);
      
      try {
        await fetchMessages();
      } catch (error) {
        console.error('Error during message polling:', error);
      }

      // Stop polling after max attempts
      if (pollCountRef.current >= maxPolls) {
        debugLog('all', 'Message polling completed - max attempts reached');
        stopPolling();
      }
    }, 3000); // Poll every 3 seconds
  }, [fetchMessages, enabled]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      debugLog('all', 'Message polling stopped');
    }
  }, []);

  // Start polling when session just started
  useEffect(() => {
    if (isSessionJustStarted && enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [isSessionJustStarted, enabled, startPolling, stopPolling]);

  return { startPolling, stopPolling };
};
