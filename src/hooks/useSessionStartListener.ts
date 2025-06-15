
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debugLogger';

interface UseSessionStartListenerProps {
  conversationId: number | null;
  onSessionStarted: () => void;
  isParticipant?: boolean;
}

export const useSessionStartListener = ({
  conversationId,
  onSessionStarted,
  isParticipant = false
}: UseSessionStartListenerProps) => {
  const channelRef = useRef<any>(null);
  const sessionStartedRef = useRef(false);

  useEffect(() => {
    if (!conversationId || !isParticipant) return;

    debugLog('all', `Setting up session start listener for conversation: ${conversationId}`);

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create channel to listen for session_started changes
    const channel = supabase
      .channel(`session-start-${conversationId}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        debugLog('all', 'Session start listener received update:', payload);
        
        if (payload.new && payload.new.session_started && !sessionStartedRef.current) {
          debugLog('all', 'Session started detected by listener!');
          sessionStartedRef.current = true;
          onSessionStarted();
        }
      })
      .subscribe((status) => {
        debugLog('all', `Session start listener status: ${status}`);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, onSessionStarted, isParticipant]);

  return { sessionStartedRef };
};
