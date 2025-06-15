
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
      const { data, error } = await supabase.rpc('is_session_host', {
        conversation_id: conversationId
      });

      if (error) {
        console.error('Error checking host status:', error);
        setIsHost(false);
        return false;
      }

      setIsHost(data || false);
      return data || false;
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
