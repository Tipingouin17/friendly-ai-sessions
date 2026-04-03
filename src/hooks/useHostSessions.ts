/**
 * use Host Sessions
 *
 * Hook for the AIfacilitator application.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useHostSessions() {
  const { 
    data: activeSessions = [], 
    isLoading, 
    refetch: refreshSessions 
  } = useQuery({
    queryKey: ['host-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          sessions!conversations_sessions_id_fkey (
            title,
            facilitator,
            objective
          )
        `)
        .eq('is_session_ended', false)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching active sessions:', error);
        throw error;
      }

      return data || [];
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  return {
    activeSessions,
    isLoading,
    refreshSessions
  };
}
