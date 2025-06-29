
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useSessionHostStatus() {
  const [isHost, setIsHost] = useState<boolean>(false);
  const { user } = useAuth();

  const checkHostStatus = async (conversationId: number) => {
    if (!user || !conversationId) {
      setIsHost(false);
      return false;
    }

    try {
      // First check if user is the conversation owner
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', conversationId)
        .single();

      if (conversationError) {
        console.error('Error checking conversation ownership:', conversationError);
      } else if (conversationData?.user_id === user.id) {
        console.log('User is conversation owner (host)');
        setIsHost(true);
        return true;
      }

      // Also check using the RPC function as fallback
      const { data: rpcResult, error: rpcError } = await supabase.rpc('is_session_host', {
        conversation_id: conversationId
      });

      if (rpcError) {
        console.error('Error checking host status via RPC:', rpcError);
        setIsHost(false);
        return false;
      }

      const hostStatus = rpcResult || false;
      console.log('Host status from RPC:', hostStatus);
      setIsHost(hostStatus);
      return hostStatus;
    } catch (error) {
      console.error('Exception checking host status:', error);
      setIsHost(false);
      return false;
    }
  };

  const setHostStatus = (status: boolean) => {
    setIsHost(status);
  };

  return {
    isHost,
    checkHostStatus,
    setHostStatus
  };
}
